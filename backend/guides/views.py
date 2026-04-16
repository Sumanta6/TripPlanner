import base64
import hashlib
import hmac
import json
import requests
import uuid

from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Activity, Booking, ChatMessage, GuideProfile, Payment, Review, build_booking_pricing
from accounts.authentication import GuideTokenAuthentication
from .serializers import (
    ActivitySerializer,
    BookingSerializer,
    CHAT_SENDABLE_STATUSES,
    CHAT_VIEWABLE_STATUSES,
    build_profile_image_url,
    ChatMessageSerializer,
    ChatThreadSerializer,
    DashboardSerializer,
    GuideProfileSerializer,
    GuideProfileUpdateSerializer,
    ReviewSummarySerializer,
    ReviewWriteSerializer,
)


TRAVELER_CANCELLABLE_STATUSES = {'payment_pending', 'pending', 'accepted'}
GUIDE_CANCELLABLE_STATUSES = {'accepted', 'active'}
GUIDE_REJECTABLE_STATUSES = {'pending'}
STATUS_REASON_CODES = {choice[0] for choice in Booking.STATUS_REASON_CHOICES}
PAYMENT_CONFIRMABLE_STATUSES = {'payment_pending'}


def _coerce_scalar(value):
    if isinstance(value, list):
        return value[0] if value else ''
    return value


def extract_status_reason_payload(data, *, required=False):
    reason_code = str(_coerce_scalar(data.get('reason_code', '')) or '').strip()
    reason_note = str(_coerce_scalar(data.get('reason_note', '')) or '').strip()

    if required and not reason_code:
        return None, Response({'error': 'A cancellation reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if reason_code and reason_code not in STATUS_REASON_CODES:
        return None, Response({'error': 'Invalid cancellation reason.'}, status=status.HTTP_400_BAD_REQUEST)

    if reason_code == 'other' and not reason_note:
        return None, Response({'error': 'Please provide a custom reason when selecting Other.'}, status=status.HTTP_400_BAD_REQUEST)

    if not reason_code and reason_note:
        return None, Response({'error': 'A reason option must be selected before adding notes.'}, status=status.HTTP_400_BAD_REQUEST)

    return {
        'status_reason_code': reason_code,
        'status_reason_note': reason_note,
    }, None


def apply_booking_status_metadata(booking, *, actor_role='', reason_code='', reason_note=''):
    booking.status_updated_by_role = actor_role
    booking.status_reason_code = reason_code
    booking.status_reason_note = reason_note


def clear_booking_status_metadata(booking):
    booking.status_updated_by_role = ''
    booking.status_reason_code = ''
    booking.status_reason_note = ''


def get_or_create_guide_profile(user):
    """Return the GuideProfile for a user, creating one if it doesn't exist."""
    profile, _ = GuideProfile.objects.get_or_create(
        user=user,
        defaults={
            'full_name': user.get_full_name() or user.username,
            'email': user.email,
        },
    )
    return profile


def get_guide_profile_or_none(user):
    try:
        return user.guide_profile
    except GuideProfile.DoesNotExist:
        return None


def get_chat_booking_for_user(user, pk):
    """Return a booking only if the current user is the guide or traveler on it."""
    booking = Booking.objects.select_related(
        'guide', 'guide__user', 'traveler_user', 'traveler_user__traveler_profile'
    ).filter(pk=pk).first()

    if not booking:
        return None

    guide_user_id = booking.guide.user_id
    traveler_user_id = booking.traveler_user_id

    if user.id not in {guide_user_id, traveler_user_id}:
        return None

    return booking


def build_chat_thread_payload(booking, request):
    is_guide = booking.guide.user_id == request.user.id
    viewer_role = 'guide' if is_guide else 'traveler'
    counterpart_name = booking.traveler_name if is_guide else (booking.guide.full_name or booking.guide.user.username)
    counterpart_email = booking.traveler_email if is_guide else (booking.guide.email or booking.guide.user.email or '')
    counterpart_avatar = ''
    if is_guide and booking.traveler_user_id and hasattr(booking.traveler_user, 'traveler_profile'):
        counterpart_avatar = build_profile_image_url(request, booking.traveler_user.traveler_profile.profile_image)
    elif not is_guide:
        counterpart_avatar = build_profile_image_url(request, booking.guide.profile_image)
    can_view_chat = booking.status in CHAT_VIEWABLE_STATUSES
    can_send_chat = booking.status in CHAT_SENDABLE_STATUSES
    locked_message = ''
    if can_view_chat and not can_send_chat:
        locked_message = 'This conversation is closed because the booking has ended.'
    elif not can_view_chat:
        locked_message = 'Chat available after acceptance'
    messages = ChatMessage.objects.select_related('sender').filter(booking=booking).order_by('created_at')

    return {
        'current_user_id': request.user.id,
        'current_user_email': request.user.email or '',
        'viewer_role': viewer_role,
        'booking_id': booking.id,
        'guide_user_id': booking.guide.user_id,
        'traveler_user_id': booking.traveler_user_id,
        'booking_status': booking.status,
        'destination': booking.destination,
        'counterpart_name': counterpart_name,
        'counterpart_avatar': counterpart_avatar,
        'counterpart_email': counterpart_email,
        'can_view_chat': can_view_chat,
        'can_send_chat': can_send_chat,
        'can_chat': can_send_chat,
        'locked_message': locked_message,
        'messages': messages,
    }


def update_outdated_booking_statuses(bookings):
    """Dynamically progression of accepted -> active -> completed based on current date."""
    from django.utils import timezone

    today = timezone.now().date()
    updated = []

    for booking in bookings:
        if booking.status == 'accepted' and today >= booking.trip_start and today <= booking.trip_end:
            booking.status = 'active'
            updated.append(booking)
        elif booking.status in ['accepted', 'active'] and today > booking.trip_end:
            booking.status = 'completed'
            updated.append(booking)

    if updated:
        Booking.objects.bulk_update(updated, ['status'])


def refresh_guide_booking_state(guide):
    """
    Refresh booking-derived guide state after a traveler or guide action.
    The public availability badge is derived from accepted/active bookings,
    so updating outdated statuses is sufficient to recalculate availability.
    """
    update_outdated_booking_statuses(guide.bookings.all())


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_list(request):
    """
    GET /api/guides/
    Returns a list of all registered guides (public).
    """
    guides = GuideProfile.objects.select_related('user').prefetch_related(
        'reviews',
        'reviews__traveler',
        'reviews__traveler__traveler_profile',
        'reviews__booking',
    ).all()
    for guide in guides:
        refresh_guide_booking_state(guide)

    serializer = GuideProfileSerializer(guides, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_detail(request, pk):
    """
    GET /api/guides/<id>/
    Returns the public profile of a single guide.
    """
    try:
        guide = GuideProfile.objects.select_related('user').prefetch_related(
            'reviews',
            'reviews__traveler',
            'reviews__traveler__traveler_profile',
            'reviews__booking',
        ).get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    refresh_guide_booking_state(guide)
    serializer = GuideProfileSerializer(guide, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guide_reviews(request, pk):
    """
    GET /api/guides/<id>/reviews/
    Returns verified reviews for a guide.
    """
    try:
        guide = GuideProfile.objects.get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    reviews = guide.reviews.select_related(
        'traveler', 'traveler__traveler_profile', 'booking'
    ).all()
    serializer = ReviewSummarySerializer(reviews, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_guide(request, pk):
    """
    POST /api/guides/<id>/request/
    Create a new payment-pending Booking draft for the specified guide.
    """
    try:
        guide = GuideProfile.objects.get(pk=pk)
    except GuideProfile.DoesNotExist:
        return Response({'error': 'Guide not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = dict(request.data) if hasattr(request.data, 'dict') else request.data.copy()

    from itinerary.models import SavedItinerary

    itinerary_id = data.get('itinerary_id')
    linked_itinerary = None
    if itinerary_id:
        try:
            linked_itinerary = SavedItinerary.objects.get(id=itinerary_id, traveler=request.user)
            if not data.get('destination'):
                data['destination'] = linked_itinerary.destination
            if not data.get('trip_start') and linked_itinerary.start_date:
                data['trip_start'] = linked_itinerary.start_date
            if not data.get('trip_end') and linked_itinerary.end_date:
                data['trip_end'] = linked_itinerary.end_date
        except SavedItinerary.DoesNotExist:
            return Response({'error': 'Saved itinerary not found.'}, status=status.HTTP_404_NOT_FOUND)

    destination = data.get('destination', '')
    if isinstance(destination, list):
        destination = destination[0]
    destination = str(destination).strip()

    trip_start = data.get('trip_start')
    if isinstance(trip_start, list):
        trip_start = trip_start[0]

    trip_end = data.get('trip_end')
    if isinstance(trip_end, list):
        trip_end = trip_end[0]

    if not destination:
        return Response({'error': 'Destination is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not trip_start:
        return Response({'error': 'Start date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not trip_end:
        return Response({'error': 'End date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if trip_end < trip_start:
        return Response({'error': 'End date cannot be earlier than start date.'}, status=status.HTTP_400_BAD_REQUEST)

    overlapping = Booking.objects.filter(
        guide=guide,
        status__in=['accepted', 'active'],
        trip_start__lte=trip_end,
        trip_end__gte=trip_start
    ).exists()
    if overlapping:
        return Response({'error': 'Guide is unavailable for selected dates.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.is_authenticated:
        traveler_overlap = Booking.objects.filter(
            guide=guide,
            traveler_user=request.user,
            status__in=['pending', 'accepted', 'active'],
            trip_start__lte=trip_end,
            trip_end__gte=trip_start,
        ).exists()
        if traveler_overlap:
            return Response(
                {'error': 'You already have a payment, active, or pending booking with this guide for the selected dates.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if hasattr(request.user, 'traveler_profile'):
        traveler_profile = request.user.traveler_profile
        data['traveler_name'] = data.get('traveler_name') or traveler_profile.full_name or request.user.username
        data['traveler_phone'] = data.get('traveler_phone') or traveler_profile.phone
    else:
        data['traveler_name'] = data.get('traveler_name') or request.user.username

    data['traveler_email'] = data.get('traveler_email') or request.user.email

    serializer = BookingSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        save_kwargs = {'guide': guide}
        if request.user.is_authenticated:
            save_kwargs['traveler_user'] = request.user
        if linked_itinerary:
            save_kwargs['itinerary'] = linked_itinerary

        booking = serializer.save(**save_kwargs)
        booking.status = 'payment_pending'
        booking.save(update_fields=['status', 'updated_at'])

        pricing = build_booking_pricing(guide, booking.trip_start, booking.trip_end)
        Payment.objects.create(
            booking=booking,
            amount=pricing['total_amount'],
            status='pending',
            payment_method='esewa',
        )
        response_serializer = BookingSerializer(booking, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_esewa_payment(request, pk):
    """
    POST /api/guides/bookings/<id>/payment/initiate/
    Generates the payload and HMAC signature for eSewa sandbox form submission.
    """
    try:
        booking = Booking.objects.select_related('payment').get(pk=pk, traveler_user=request.user)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    payment = getattr(booking, 'payment', None)
    if not payment:
        return Response({'error': 'Payment record not found for this booking.'}, status=status.HTTP_404_NOT_FOUND)

    refresh_guide_booking_state(booking.guide)
    booking.refresh_from_db(fields=['status'])

    if booking.status not in PAYMENT_CONFIRMABLE_STATUSES:
        return Response(
            {'error': 'This booking is no longer waiting for payment.', 'status': booking.status},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if payment.status == 'paid':
        return Response({'error': 'This booking has already been paid.'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate transaction UUID based on payment id + timestamp to make it unique per retry
    transaction_uuid = f"booking-{booking.id}-{uuid.uuid4().hex[:6]}"
    
    amount = str(float(payment.amount))
    product_code = getattr(settings, 'ESEWA_MERCHANT_CODE', 'EPAYTEST')
    secret_key = getattr(settings, 'ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q')

    # eSewa v2 signature requirement: total_amount,transaction_uuid,product_code
    message = f"total_amount={amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    
    # Generate HMAC SHA256 signature
    hash_digest = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    signature = base64.b64encode(hash_digest).decode('utf-8')
    
    payment.payment_method = 'esewa'
    payment.transaction_id = transaction_uuid
    payment.save(update_fields=['payment_method', 'transaction_id', 'updated_at'])
    
    return Response({
        'amount': amount,
        'tax_amount': "0",
        'total_amount': amount,
        'transaction_uuid': transaction_uuid,
        'product_code': product_code,
        'product_service_charge': "0",
        'product_delivery_charge': "0",
        'success_url': getattr(settings, 'ESEWA_FRONTEND_SUCCESS_URL', 'http://localhost:3000/guides/payment/callback?status=success'),
        'failure_url': getattr(settings, 'ESEWA_FRONTEND_FAILURE_URL', 'http://localhost:3000/guides/payment/callback?status=failure'),
        'signed_field_names': "total_amount,transaction_uuid,product_code",
        'signature': signature,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_esewa_payment(request):
    """
    POST /api/guides/bookings/payment/verify/
    Verify the payment based on the base64 encoded data parameter returned by eSewa URL redirect.
    """
    data_b64 = request.data.get('data')
    if not data_b64:
        return Response({'error': 'No data payload provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        decoded_bytes = base64.b64decode(data_b64)
        decoded_data = json.loads(decoded_bytes.decode('utf-8'))
    except Exception:
        return Response({'error': 'Invalid data payload.'}, status=status.HTTP_400_BAD_REQUEST)
        
    transaction_uuid = decoded_data.get('transaction_uuid')
    total_amount = decoded_data.get('total_amount')
    esewa_status = decoded_data.get('status')
    
    if not transaction_uuid:
        return Response({'error': 'Missing transaction UUID.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # e.g., booking-123-abc123
        booking_id = int(transaction_uuid.split('-')[1])
        booking = Booking.objects.select_related('payment', 'guide').get(pk=booking_id, traveler_user=request.user)
    except (IndexError, ValueError, Booking.DoesNotExist):
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    payment = getattr(booking, 'payment', None)
    if not payment or payment.transaction_id != transaction_uuid:
         return Response({'error': 'Transaction mismatch.'}, status=status.HTTP_400_BAD_REQUEST)
         
    if esewa_status != 'COMPLETE':
         payment.status = 'failed'
         payment.save(update_fields=['status', 'updated_at'])
         return Response({'error': 'Payment was not marked complete by eSewa.', 'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)
         
    # Perform backend verification server-to-server call to eSewa to strictly verify
    product_code = getattr(settings, 'ESEWA_MERCHANT_CODE', 'EPAYTEST')
    amount_str = str(total_amount).replace(',', '')  # Sometimes eSewa adds commas
    
    verification_url = f"https://rc-epay.esewa.com.np/api/epay/transaction/status/?product_code={product_code}&total_amount={amount_str}&transaction_uuid={transaction_uuid}"
    
    try:
        verify_response = requests.get(verification_url, timeout=10)
        verify_data = verify_response.json()
    except Exception:
        return Response({'error': 'eSewa verification request failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    if verify_data.get('status') == 'COMPLETE':
        payment.status = 'paid'
        payment.save(update_fields=['status', 'updated_at'])
        
        if booking.status == 'payment_pending':
            booking.status = 'pending'
            booking.save(update_fields=['status', 'updated_at'])
            
            Activity.objects.create(
                guide=booking.guide,
                activity_type='request',
                message=f"New guide request from {booking.traveler_name}",
                highlight=f"To {booking.destination}",
                sub=f"{booking.trip_start} to {booking.trip_end}"
            )
            
        serializer = BookingSerializer(booking, context={'request': request})
        return Response({'booking': serializer.data, 'payment_status': payment.status}, status=status.HTTP_200_OK)
        
    else:
        payment.status = 'failed'
        payment.save(update_fields=['status', 'updated_at'])
        return Response({'error': 'Payment verification failed.', 'esewa_ref': verify_data}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    GET  /api/guides/me/  – Return the logged-in guide's profile.
    PATCH /api/guides/me/ – Partially update profile fields.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = GuideProfileSerializer(guide, context={'request': request})
        return Response(serializer.data)

    serializer = GuideProfileUpdateSerializer(guide, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(GuideProfileSerializer(guide, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def my_bookings(request):
    """
    GET /api/guides/me/bookings/
    Returns all bookings (travelers) assigned to the logged-in guide.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)
    bookings = guide.bookings.select_related(
        'traveler_user', 'traveler_user__traveler_profile', 'itinerary', 'payment'
    ).exclude(status='payment_pending')
    update_outdated_booking_statuses(bookings)

    status_filter = request.query_params.get('status')
    if status_filter:
        bookings = bookings.filter(status=status_filter)

    serializer = BookingSerializer(
        bookings,
        many=True,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_booked_trips(request):
    """
    GET /api/guides/my-trips/
    Returns all bookings made by the logged-in traveler.
    """
    bookings = Booking.objects.select_related(
        'guide', 'guide__user', 'itinerary', 'review', 'payment'
    ).filter(traveler_user=request.user).order_by('-created_at')
    update_outdated_booking_statuses(bookings)

    serializer = BookingSerializer(bookings, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, pk):
    """
    POST /api/guides/bookings/<pk>/cancel/
    Allow a traveler to cancel their own payment-pending, pending, or accepted booking.
    """
    try:
        booking = Booking.objects.select_related('guide').get(pk=pk, traveler_user=request.user)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    reason_payload, error_response = extract_status_reason_payload(request.data, required=True)
    if error_response:
        return error_response

    refresh_guide_booking_state(booking.guide)
    booking.refresh_from_db(fields=['status', 'updated_at', 'status_reason_code', 'status_reason_note', 'status_updated_by_role'])

    if booking.status not in TRAVELER_CANCELLABLE_STATUSES:
        return Response(
            {
                'error': 'Only payment-pending, pending, or accepted bookings can be cancelled by the traveler.',
                'status': booking.status,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    booking.status = 'cancelled'
    apply_booking_status_metadata(
        booking,
        actor_role='traveler',
        reason_code=reason_payload['status_reason_code'],
        reason_note=reason_payload['status_reason_note'],
    )
    booking.save(update_fields=['status', 'status_reason_code', 'status_reason_note', 'status_updated_by_role', 'updated_at'])
    refresh_guide_booking_state(booking.guide)

    serializer = BookingSerializer(booking, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def booking_detail(request, pk):
    """
    GET /api/guides/me/bookings/<pk>/
    Returns full details for a single booking, including the nested itinerary.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        booking = guide.bookings.exclude(status='payment_pending').get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BookingSerializer(
        booking,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['PATCH'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def update_booking_status(request, pk):
    """
    PATCH /api/guides/me/bookings/<pk>/status/
    Update the status of a specific booking.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        booking = guide.bookings.exclude(status='payment_pending').get(pk=pk)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in dict(Booking.STATUS_CHOICES):
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    reason_required = new_status in {'rejected', 'cancelled'}
    reason_payload, error_response = extract_status_reason_payload(request.data, required=reason_required)
    if error_response:
        return error_response

    if new_status == 'accepted' and booking.status != 'pending':
        return Response({'error': 'Only pending bookings can be accepted.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_status == 'rejected' and booking.status not in GUIDE_REJECTABLE_STATUSES:
        return Response({'error': 'Only pending bookings can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_status == 'cancelled' and booking.status not in GUIDE_CANCELLABLE_STATUSES:
        return Response({'error': 'Only accepted or active bookings can be released.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_status == 'completed' and booking.status not in {'accepted', 'active'}:
        return Response({'error': 'Only accepted or active bookings can be completed.'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = new_status
    if new_status in {'rejected', 'cancelled'}:
        apply_booking_status_metadata(
            booking,
            actor_role='guide',
            reason_code=reason_payload['status_reason_code'],
            reason_note=reason_payload['status_reason_note'],
        )
    else:
        clear_booking_status_metadata(booking)
    booking.save(update_fields=['status', 'status_reason_code', 'status_reason_note', 'status_updated_by_role', 'updated_at'])

    if new_status == 'accepted':
        overlapping = Booking.objects.filter(
            guide=guide,
            status='pending',
            trip_start__lte=booking.trip_end,
            trip_end__gte=booking.trip_start
        ).exclude(pk=booking.pk)

        for overlapping_booking in overlapping:
            overlapping_booking.status = 'auto_rejected'
            overlapping_booking.notes = f"{overlapping_booking.notes}\n\n[System] Guide unavailable for selected dates."
            apply_booking_status_metadata(
                overlapping_booking,
                actor_role='system',
                reason_code='schedule_conflict',
                reason_note='Guide became unavailable for the selected dates after another booking was accepted.',
            )
            overlapping_booking.save(update_fields=['status', 'notes', 'status_reason_code', 'status_reason_note', 'status_updated_by_role', 'updated_at'])
            Activity.objects.create(
                guide=guide,
                activity_type='auto_rejected',
                message=f"Auto-rejected request from {overlapping_booking.traveler_name} due to date conflict.",
                highlight=f"To {overlapping_booking.destination}"
            )

    if new_status == 'accepted':
        Activity.objects.create(
            guide=guide,
            activity_type='accepted',
            message=f"Accepted request from {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )
    elif new_status == 'rejected':
        Activity.objects.create(
            guide=guide,
            activity_type='rejected',
            message=f"Declined request from {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )
    elif new_status == 'cancelled':
        Activity.objects.create(
            guide=guide,
            activity_type='rejected',
            message=f"Released booking with {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )
    elif new_status == 'completed':
        Activity.objects.create(
            guide=guide,
            activity_type='completed',
            message=f"Completed trip with {booking.traveler_name}",
            highlight=f"To {booking.destination}"
        )

    refresh_guide_booking_state(guide)
    booking.refresh_from_db()
    serializer = BookingSerializer(
        booking,
        context={'request': request, 'restrict_guide_communication': True},
    )
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_review(request):
    """
    POST /api/guides/reviews/
    Create a verified review for a completed booking.
    """
    serializer = ReviewWriteSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    review = serializer.save()
    guide = review.guide

    Activity.objects.create(
        guide=guide,
        activity_type='rating',
        message=f"New {review.rating}-star review from {review.booking.traveler_name}",
        highlight=f"To {review.booking.destination}"
    )

    response_serializer = ReviewSummarySerializer(review, context={'request': request})
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def booking_chat(request, pk):
    """
    GET  /api/guides/bookings/<pk>/chat/ – fetch booking chat thread
    POST /api/guides/bookings/<pk>/chat/ – send a message into booking chat thread
    """
    try:
        booking = get_chat_booking_for_user(request.user, pk)
    except (ProgrammingError, OperationalError):
        return Response(
            {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not booking:
        return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    update_outdated_booking_statuses([booking])

    can_view_chat = booking.status in CHAT_VIEWABLE_STATUSES
    can_send_chat = booking.status in CHAT_SENDABLE_STATUSES
    if request.method == 'GET' and not can_view_chat:
        return Response(
            {'error': 'Chat available after acceptance.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == 'POST' and not can_send_chat:
        return Response(
            {'error': 'This chat is read-only for the current booking status.' if booking.status == 'completed' else 'Chat available after acceptance.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'POST':
        message = str(request.data.get('message', '')).strip()
        if not message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.guide.user_id == request.user.id:
            sender_role = 'guide'
            receiver = booking.traveler_user
        elif booking.traveler_user_id == request.user.id:
            sender_role = 'traveler'
            receiver = booking.guide.user
        else:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if receiver is None:
            return Response({'error': 'This booking chat is unavailable because the other participant account is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            chat_message = ChatMessage.objects.create(
                booking=booking,
                sender=request.user,
                receiver=receiver,
                sender_role=sender_role,
                message=message,
            )
        except (ProgrammingError, OperationalError):
            return Response(
                {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        serializer = ChatMessageSerializer(chat_message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    try:
        thread_payload = build_chat_thread_payload(booking, request)
    except (ProgrammingError, OperationalError):
        return Response(
            {'error': 'Chat service is unavailable until the latest database migrations are applied.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    serializer = ChatThreadSerializer(thread_payload, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def my_activity(request):
    """
    GET /api/guides/me/activity/
    Returns the recent activity feed for the logged-in guide.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)
    limit = int(request.query_params.get('limit', 20))
    activities = guide.activities.all()[:limit]

    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def my_dashboard(request):
    """
    GET /api/guides/me/dashboard/
    Returns aggregated stats for the analytics dashboard page.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)
    bookings = guide.bookings.exclude(status='payment_pending')
    total = bookings.count()

    counts = {item['status']: item['count'] for item in bookings.values('status').annotate(count=Count('status'))}

    active = counts.get('active', 0)
    pending = counts.get('pending', 0)
    upcoming = counts.get('upcoming', 0)
    completed = counts.get('completed', 0)
    completion_rate = round((completed / total * 100), 1) if total else 0

    dest_counts = {}
    for booking in bookings.values('destination'):
        destination = booking['destination'].split('&')[0].strip().split()[0]
        dest_counts[destination] = dest_counts.get(destination, 0) + 1

    top_destinations = [
        {'name': destination, 'count': count}
        for destination, count in sorted(dest_counts.items(), key=lambda item: -item[1])[:4]
    ]

    rating = GuideProfileSerializer(guide, context={'request': request}).data['rating']
    data = {
        'total_travelers': total,
        'active_trips': active,
        'pending_requests': pending,
        'upcoming_trips': upcoming,
        'completed_trips': completed,
        'completion_rate': completion_rate,
        'top_destinations': top_destinations,
        'rating': rating,
        'tours_completed': guide.tours_completed,
        'experience_years': guide.experience_years,
        'languages_count': len(guide.languages),
        'destinations_count': len(guide.destinations),
    }

    serializer = DashboardSerializer(data)
    return Response(serializer.data)

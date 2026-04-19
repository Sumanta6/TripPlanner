import base64
import hashlib
import hmac
import json
import logging
from decimal import Decimal, ROUND_HALF_UP
import requests
import uuid
from urllib.parse import urlencode, urlparse

from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.db.models import Count
from django.http import HttpResponseRedirect
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
    build_review_breakdown,
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
ESEWA_SIGNED_FIELD_NAMES = 'total_amount,transaction_uuid,product_code'
logger = logging.getLogger(__name__)


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


def _format_esewa_amount(value):
    amount = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return format(amount, '.2f')


def _get_esewa_config():
    config = {
        'merchant_id': (getattr(settings, 'ESEWA_MERCHANT_ID', '') or '').strip(),
        'secret_key': (getattr(settings, 'ESEWA_SECRET_KEY', '') or '').strip(),
        'payment_url': (getattr(settings, 'ESEWA_PAYMENT_URL', '') or '').strip(),
        'status_url': (getattr(settings, 'ESEWA_STATUS_URL', '') or '').strip(),
        'success_url': (getattr(settings, 'ESEWA_SUCCESS_URL', '') or '').strip(),
        'failure_url': (getattr(settings, 'ESEWA_FAILURE_URL', '') or '').strip(),
    }
    env_names = {
        'merchant_id': 'ESEWA_MERCHANT_ID',
        'secret_key': 'ESEWA_SECRET_KEY',
        'payment_url': 'ESEWA_PAYMENT_URL',
        'status_url': 'ESEWA_STATUS_URL',
        'success_url': 'ESEWA_SUCCESS_URL',
        'failure_url': 'ESEWA_FAILURE_URL',
    }
    required_keys = {'merchant_id', 'secret_key', 'payment_url', 'success_url', 'failure_url'}
    missing = [env_names[key] for key, value in config.items() if key in required_keys and not value]
    return config, missing


def _build_esewa_signature(*, total_amount, transaction_uuid, product_code, secret_key):
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    digest = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode('utf-8')


def _build_hmac_base64(message, secret_key):
    digest = hmac.new(
        secret_key.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode('utf-8')


def _verify_esewa_callback_signature(callback_data, secret_key):
    signed_field_names = str(callback_data.get('signed_field_names') or '').strip()
    signature = str(callback_data.get('signature') or '').strip()
    if not signed_field_names or not signature or not secret_key:
        return False

    field_names = [field.strip() for field in signed_field_names.split(',') if field.strip()]
    if not field_names:
        return False

    message = ",".join(f"{field}={callback_data.get(field, '')}" for field in field_names)
    expected_signature = _build_hmac_base64(message, secret_key)
    return hmac.compare_digest(signature, expected_signature)


def _build_esewa_status_url(payment_url):
    explicit_status_url = (getattr(settings, 'ESEWA_STATUS_URL', '') or '').strip()
    if explicit_status_url:
        return explicit_status_url

    parsed = urlparse(payment_url)
    if not parsed.scheme or not parsed.netloc:
        return ''

    host_map = {
        'rc-epay.esewa.com.np': 'https://rc.esewa.com.np/api/epay/transaction/status/',
        'epay.esewa.com.np': 'https://esewa.com.np/api/epay/transaction/status/',
        'uat.esewa.com.np': 'https://uat.esewa.com.np/api/epay/transaction/status/',
    }
    if parsed.netloc in host_map:
        return host_map[parsed.netloc]

    return f"{parsed.scheme}://{parsed.netloc}/api/epay/transaction/status/"


def _ensure_payment_record(booking):
    payment = getattr(booking, 'payment', None)
    if payment:
        return payment

    pricing = build_booking_pricing(booking.guide, booking.trip_start, booking.trip_end)
    payment, _ = Payment.objects.get_or_create(
        booking=booking,
        defaults={
            'amount': pricing['total_amount'],
            'status': 'pending',
            'payment_method': 'esewa',
        },
    )
    return payment


def _normalize_request_payload(query_dict):
    payload = {}
    for key in query_dict.keys():
        values = query_dict.getlist(key)
        payload[key] = values if len(values) > 1 else query_dict.get(key)
    return payload


def _build_payment_response_payload(booking, payment=None, **extra):
    payload = {
        'booking_id': booking.id,
        'booking_status': booking.status,
        'payment_status': payment.status if payment else '',
        'can_retry_payment': bool(
            booking.status == 'payment_pending' and payment and payment.status in {'pending', 'failed'}
        ),
        'next_action': extra.pop('next_action', None),
    }
    payload.update(extra)
    return payload


def _payment_error_response(booking, payment, *, message, error_code, http_status, next_action=None, include_booking=False):
    payload = _build_payment_response_payload(
        booking,
        payment,
        error=message,
        error_code=error_code,
        next_action=next_action,
    )
    if include_booking:
        payload['booking'] = BookingSerializer(booking).data
    return Response(payload, status=http_status)


def _build_callback_redirect_url(target_url, params):
    encoded = urlencode({key: value for key, value in params.items() if value not in (None, '')})
    separator = '&' if '?' in target_url else '?'
    return f"{target_url}{separator}{encoded}" if encoded else target_url


def _get_frontend_callback_url():
    frontend_url = (getattr(settings, 'ESEWA_FRONTEND_CALLBACK_URL', '') or '').strip()
    if frontend_url:
        normalized = frontend_url.rstrip('/')

        # Traveler payments must always return to the traveler app.
        # If a stale env value still points at the old guide callback path
        # or some auth route, rewrite it to the traveler callback.
        if (
            '/guides/payment/callback' in normalized
            or normalized.endswith('/login')
            or ':3001' in normalized
        ):
            normalized = normalized.replace(':3001', ':3000')
            normalized = normalized.replace('/guides/payment/callback', '/payment/callback')
            if normalized.endswith('/login'):
                normalized = normalized[: -len('/login')] + '/payment/callback'
            return normalized

        return normalized

    return 'http://localhost:3000/payment/callback'


def _build_frontend_callback_payload(*, result_status, message, booking=None, payment=None, transaction_uuid='', status_code=''):
    return {
        'status': result_status,
        'message': message,
        'booking_id': booking.id if booking else '',
        'guide_id': booking.guide_id if booking else '',
        'transaction_uuid': transaction_uuid or (payment.transaction_id if payment else ''),
        'payment_status': payment.status if payment else '',
        'booking_status': booking.status if booking else '',
        'status_code': status_code,
    }


def _build_esewa_return_url(base_url, *, booking, transaction_uuid, total_amount):
    normalized_base = base_url.rstrip('/')
    return (
        f"{normalized_base}/"
        f"{booking.id}/"
        f"{booking.guide_id}/"
        f"{transaction_uuid}/"
        f"{total_amount}/"
    )


def _evaluate_booking_payability(booking, payment):
    if payment and payment.status == 'paid':
        if booking.status == 'payment_pending':
            booking.status = 'pending'
            booking.save(update_fields=['status', 'updated_at'])
        return {
            'is_payable': False,
            'error_code': 'already_paid',
            'message': 'This booking has already been paid.',
            'next_action': 'view_profile',
            'http_status': status.HTTP_409_CONFLICT,
        }

    if booking.status == 'payment_pending':
        return {
            'is_payable': True,
            'next_action': 'complete_payment',
            'http_status': status.HTTP_200_OK,
        }

    state_map = {
        'cancelled': ('booking_cancelled', 'This booking has been cancelled and can no longer be paid.', 'request_again'),
        'completed': ('booking_completed', 'This booking is already completed and cannot be paid again.', 'view_profile'),
        'rejected': ('booking_rejected', 'This booking was rejected and cannot be paid.', 'request_again'),
        'auto_rejected': ('booking_rejected', 'This booking was rejected and cannot be paid.', 'request_again'),
        'expired': ('booking_expired', 'This booking has expired and can no longer be paid.', 'request_again'),
        'pending': ('booking_not_payable', 'This booking has already been submitted to the guide and no longer needs payment.', 'view_profile'),
        'accepted': ('booking_not_payable', 'This booking has already been accepted and cannot be paid again.', 'view_profile'),
        'active': ('booking_not_payable', 'This booking is already active and cannot be paid again.', 'view_profile'),
    }
    error_code, message, next_action = state_map.get(
        booking.status,
        ('booking_not_payable', f'This booking is not payable in its current state: {booking.status}.', 'view_profile'),
    )
    return {
        'is_payable': False,
        'error_code': error_code,
        'message': message,
        'next_action': next_action,
        'http_status': status.HTTP_400_BAD_REQUEST,
    }


def _extract_esewa_callback_data(request):
    combined = request.GET.copy()
    combined.update(request.POST)
    raw_payload = _normalize_request_payload(combined)
    data_b64 = combined.get('data')

    logger.info(
        "eSewa callback raw payload",
        extra={
            'query_params': _normalize_request_payload(request.GET),
            'post_params': _normalize_request_payload(request.POST),
        },
    )

    decoded_data = {}
    decode_error = ''
    if data_b64:
        try:
            decoded_bytes = base64.b64decode(data_b64)
            decoded_data = json.loads(decoded_bytes.decode('utf-8'))
        except Exception:
            decode_error = 'Invalid data payload.'

    callback_data = decoded_data.copy() if decoded_data else {}
    callback_data.setdefault('transaction_uuid', combined.get('transaction_uuid') or combined.get('oid') or '')
    callback_data.setdefault('total_amount', combined.get('total_amount') or combined.get('amt') or '')
    callback_data.setdefault('status', combined.get('status') or '')
    callback_data.setdefault('product_code', combined.get('product_code') or '')
    callback_data.setdefault('reference_id', combined.get('refId') or combined.get('transaction_code') or '')
    callback_data.setdefault('signed_field_names', combined.get('signed_field_names') or '')
    callback_data.setdefault('signature', combined.get('signature') or '')
    return {
        'raw_payload': raw_payload,
        'callback_data': callback_data,
        'decode_error': decode_error,
        'has_data_param': bool(data_b64),
    }


def _normalize_esewa_verification_input(payload):
    data_b64 = payload.get('data')
    if data_b64:
        try:
            decoded_bytes = base64.b64decode(data_b64)
            decoded_data = json.loads(decoded_bytes.decode('utf-8'))
        except Exception:
            return None, 'Invalid data payload.'
        return {
            'transaction_uuid': decoded_data.get('transaction_uuid', ''),
            'total_amount': decoded_data.get('total_amount', ''),
            'status': decoded_data.get('status', ''),
            'product_code': decoded_data.get('product_code', ''),
        }, ''

    return {
        'transaction_uuid': payload.get('transaction_uuid', '') or payload.get('oid', ''),
        'total_amount': payload.get('total_amount', '') or payload.get('amt', ''),
        'status': payload.get('status', ''),
        'product_code': payload.get('product_code', ''),
    }, ''


def _process_esewa_verification(callback_data, *, expected_user_id=None):
    transaction_uuid = str(callback_data.get('transaction_uuid') or '').strip()
    total_amount = str(callback_data.get('total_amount') or '').replace(',', '').strip()
    esewa_status = str(callback_data.get('status') or '').strip().upper()

    if not transaction_uuid:
        return {
            'ok': False,
            'http_status': status.HTTP_400_BAD_REQUEST,
            'result_status': 'invalid',
            'message': 'Missing transaction UUID in the eSewa response.',
            'error_code': 'missing_transaction_uuid',
            'booking': None,
            'payment': None,
        }

    payment_qs = Payment.objects.select_related('booking', 'booking__guide')
    if expected_user_id is not None:
        payment_qs = payment_qs.filter(booking__traveler_user_id=expected_user_id)

    payment = payment_qs.filter(transaction_id=transaction_uuid).first()
    if not payment:
        return {
            'ok': False,
            'http_status': status.HTTP_404_NOT_FOUND,
            'result_status': 'invalid',
            'message': 'Matching booking payment not found for this eSewa response.',
            'error_code': 'payment_not_found',
            'booking': None,
            'payment': None,
        }

    booking = payment.booking

    if payment.status == 'paid':
        if booking.status == 'payment_pending':
            booking.status = 'pending'
            booking.save(update_fields=['status', 'updated_at'])
        return {
            'ok': True,
            'http_status': status.HTTP_200_OK,
            'result_status': 'success',
            'message': 'Payment already verified successfully.',
            'error_code': 'already_paid',
            'booking': booking,
            'payment': payment,
        }

    esewa_config, missing = _get_esewa_config()
    if missing:
        return {
            'ok': False,
            'http_status': status.HTTP_400_BAD_REQUEST,
            'result_status': 'invalid',
            'message': f"eSewa payment verification is not configured correctly. Missing settings: {', '.join(missing)}.",
            'error_code': 'payment_config_missing',
            'booking': booking,
            'payment': payment,
        }

    callback_signature_valid = _verify_esewa_callback_signature(callback_data, esewa_config['secret_key'])
    logger.info(
        "eSewa callback signature check",
        extra={
            'booking_id': booking.id,
            'transaction_uuid': transaction_uuid,
            'callback_status': esewa_status,
            'signature_present': bool(callback_data.get('signature')),
            'signed_fields_present': bool(callback_data.get('signed_field_names')),
            'callback_signature_valid': callback_signature_valid,
        },
    )

    if esewa_status == 'COMPLETE' and callback_signature_valid:
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

        return {
            'ok': True,
            'http_status': status.HTTP_200_OK,
            'result_status': 'success',
            'message': 'Payment verified successfully.',
            'error_code': '',
            'booking': booking,
            'payment': payment,
        }

    status_url = _build_esewa_status_url(esewa_config['payment_url'])
    if not status_url:
        return {
            'ok': False,
            'http_status': status.HTTP_400_BAD_REQUEST,
            'result_status': 'invalid',
            'message': 'Invalid ESEWA_PAYMENT_URL configuration.',
            'error_code': 'invalid_payment_url',
            'booking': booking,
            'payment': payment,
        }

    if not total_amount:
        return {
            'ok': False,
            'http_status': status.HTTP_400_BAD_REQUEST,
            'result_status': 'invalid',
            'message': 'Missing total amount from eSewa response.',
            'error_code': 'missing_total_amount',
            'booking': booking,
            'payment': payment,
        }

    try:
        verify_response = requests.get(
            status_url,
            params={
                'product_code': esewa_config['merchant_id'],
                'total_amount': total_amount,
                'transaction_uuid': transaction_uuid,
            },
            timeout=10,
        )
        verify_response.raise_for_status()
        verify_data = verify_response.json()
    except requests.RequestException as exc:
        logger.warning(
            "eSewa verification request failed",
            extra={
                'booking_id': booking.id,
                'transaction_uuid': transaction_uuid,
                'status_url': status_url,
                'error': str(exc),
                'callback_signature_valid': callback_signature_valid,
                'callback_status': esewa_status,
            },
        )
        return {
            'ok': False,
            'http_status': status.HTTP_502_BAD_GATEWAY,
            'result_status': 'failed',
            'message': 'eSewa verification request failed.',
            'error_code': 'verification_request_failed',
            'booking': booking,
            'payment': payment,
        }
    except ValueError:
        return {
            'ok': False,
            'http_status': status.HTTP_502_BAD_GATEWAY,
            'result_status': 'invalid',
            'message': 'Invalid verification response from eSewa.',
            'error_code': 'invalid_verification_response',
            'booking': booking,
            'payment': payment,
        }

    verify_status = str(verify_data.get('status') or '').strip().upper()

    if verify_status == 'COMPLETE':
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

        return {
            'ok': True,
            'http_status': status.HTTP_200_OK,
            'result_status': 'success',
            'message': 'Payment verified successfully.',
            'error_code': '',
            'booking': booking,
            'payment': payment,
        }

    if verify_status in {'PENDING', 'AMBIGUOUS'}:
        payment.status = 'pending'
        payment.save(update_fields=['status', 'updated_at'])
        return {
            'ok': False,
            'http_status': status.HTTP_409_CONFLICT,
            'result_status': 'failed',
            'message': 'Payment is still pending and could not be confirmed yet.',
            'error_code': 'payment_pending_confirmation',
            'booking': booking,
            'payment': payment,
        }

    if verify_status in {'CANCELED', 'CANCELLED'} or esewa_status in {'CANCELED', 'CANCELLED', 'USER_CANCELLED'}:
        payment.status = 'failed'
        payment.save(update_fields=['status', 'updated_at'])
        return {
            'ok': False,
            'http_status': status.HTTP_400_BAD_REQUEST,
            'result_status': 'cancelled',
            'message': 'Payment was cancelled before completion.',
            'error_code': 'payment_cancelled',
            'booking': booking,
            'payment': payment,
        }

    payment.status = 'failed'
    payment.save(update_fields=['status', 'updated_at'])
    return {
        'ok': False,
        'http_status': status.HTTP_400_BAD_REQUEST,
        'result_status': 'failed',
        'message': 'Payment could not be verified with eSewa.',
        'error_code': 'verification_failed',
        'booking': booking,
        'payment': payment,
    }


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
def initiate_esewa_payment(request, pk):
    """
    POST /api/guides/bookings/<id>/payment/initiate/
    Generates the payload and HMAC signature for eSewa sandbox form submission.
    """
    booking = Booking.objects.select_related('guide', 'payment').filter(pk=pk).first()
    if not booking:
        logger.warning("eSewa initiate rejected: booking missing", extra={'booking_id': pk, 'user_id': request.user.id})
        return Response(
            {'error': 'Booking not found.', 'error_code': 'booking_not_found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if booking.traveler_user_id != request.user.id:
        logger.warning(
            "eSewa initiate rejected: ownership mismatch",
            extra={'booking_id': booking.id, 'booking_traveler_id': booking.traveler_user_id, 'request_user_id': request.user.id},
        )
        return Response(
            {'error': 'You do not have permission to pay for this booking.', 'error_code': 'forbidden_booking'},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh_guide_booking_state(booking.guide)
    booking.refresh_from_db()
    payment = getattr(booking, 'payment', None)

    logger.debug(
        "eSewa initiate request state",
        extra={
            'booking_id': booking.id,
            'booking_status': booking.status,
            'payment_status': payment.status if payment else 'missing',
            'traveler_user_id': booking.traveler_user_id,
            'request_user_id': request.user.id,
        },
    )

    payability = _evaluate_booking_payability(booking, payment)
    payment = getattr(booking, 'payment', None)
    if not payability['is_payable']:
        logger.info(
            "eSewa initiate rejected: booking not payable",
            extra={
                'booking_id': booking.id,
                'booking_status': booking.status,
                'payment_status': payment.status if payment else 'missing',
                'error_code': payability['error_code'],
            },
        )
        return _payment_error_response(
            booking,
            payment,
            message=payability['message'],
            error_code=payability['error_code'],
            http_status=payability['http_status'],
            next_action=payability['next_action'],
            include_booking=True,
        )

    if payment is None:
        payment = _ensure_payment_record(booking)
        logger.info(
            "eSewa initiate created missing payment record",
            extra={'booking_id': booking.id, 'payment_status': payment.status},
        )

    if payment.status not in {'pending', 'failed'}:
        logger.warning(
            "eSewa initiate rejected: invalid payment status",
            extra={'booking_id': booking.id, 'booking_status': booking.status, 'payment_status': payment.status},
        )
        return _payment_error_response(
            booking,
            payment,
            message='This booking does not have a payable payment draft right now.',
            error_code='invalid_payment_status',
            http_status=status.HTTP_409_CONFLICT,
            next_action='view_profile',
            include_booking=True,
        )

    esewa_config, missing = _get_esewa_config()
    logger.debug(
        "eSewa initiate config presence",
        extra={
            'booking_id': booking.id,
            'has_merchant_id': bool(esewa_config['merchant_id']),
            'has_secret_key': bool(esewa_config['secret_key']),
            'has_payment_url': bool(esewa_config['payment_url']),
            'has_status_url': bool(esewa_config['status_url']),
            'has_success_url': bool(esewa_config['success_url']),
            'has_failure_url': bool(esewa_config['failure_url']),
        },
    )
    logger.info(
        "eSewa initiate config check",
        extra={
            'booking_id': booking.id,
            'merchant_id_loaded': bool(esewa_config['merchant_id']),
            'secret_key_loaded': bool(esewa_config['secret_key']),
            'payment_url_loaded': bool(esewa_config['payment_url']),
            'status_url_loaded': bool(esewa_config['status_url']),
            'success_url_loaded': bool(esewa_config['success_url']),
            'failure_url_loaded': bool(esewa_config['failure_url']),
        },
    )
    if missing:
        logger.warning(
            "eSewa initiate rejected: config missing",
            extra={'booking_id': booking.id, 'missing_fields': missing},
        )
        return Response(
            {
                'error': f"eSewa payment is not configured correctly. Missing settings: {', '.join(missing)}.",
                'error_code': 'payment_config_missing',
                'missing_fields': missing,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if payment.transaction_id:
        logger.info(
            "eSewa initiate overwriting existing unpaid transaction id",
            extra={'booking_id': booking.id, 'old_transaction_id': payment.transaction_id, 'payment_status': payment.status},
        )

    transaction_uuid = f"booking-{booking.id}-{uuid.uuid4().hex[:12]}"
    amount = _format_esewa_amount(payment.amount)
    signature = _build_esewa_signature(
        total_amount=amount,
        transaction_uuid=transaction_uuid,
        product_code=esewa_config['merchant_id'],
        secret_key=esewa_config['secret_key'],
    )

    payment.payment_method = 'esewa'
    payment.status = 'pending'
    payment.transaction_id = transaction_uuid
    payment.save(update_fields=['payment_method', 'status', 'transaction_id', 'updated_at'])

    success_url = _build_esewa_return_url(
        esewa_config['success_url'],
        booking=booking,
        transaction_uuid=transaction_uuid,
        total_amount=amount,
    )
    failure_url = _build_esewa_return_url(
        esewa_config['failure_url'],
        booking=booking,
        transaction_uuid=transaction_uuid,
        total_amount=amount,
    )

    logger.info(
        "eSewa initiate prepared redirect",
        extra={
            'booking_id': booking.id,
            'booking_status': booking.status,
            'payment_status': payment.status,
            'transaction_uuid': transaction_uuid,
            'success_url': success_url,
            'failure_url': failure_url,
        },
    )

    form_data = {
        'amount': amount,
        'tax_amount': '0',
        'total_amount': amount,
        'transaction_uuid': transaction_uuid,
        'product_code': esewa_config['merchant_id'],
        'product_service_charge': '0',
        'product_delivery_charge': '0',
        'success_url': success_url,
        'failure_url': failure_url,
        'signed_field_names': ESEWA_SIGNED_FIELD_NAMES,
        'signature': signature,
    }

    return Response({
        'payment_url': esewa_config['payment_url'],
        'form_data': form_data,
        'booking_id': booking.id,
        'booking_status': booking.status,
        'payment_status': payment.status,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_esewa_payment(request):
    """
    POST /api/guides/bookings/payment/verify/
    Verify the payment based on the payload returned by eSewa.
    """
    callback_data = request.data.copy()
    if not callback_data.get('data') and not callback_data.get('transaction_uuid') and not callback_data.get('oid'):
        return Response({'error': 'No eSewa callback payload provided.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized_data, decode_error = _normalize_esewa_verification_input(callback_data)
    if decode_error:
        return Response({'error': decode_error}, status=status.HTTP_400_BAD_REQUEST)

    result = _process_esewa_verification(normalized_data, expected_user_id=request.user.id)
    booking = result.get('booking')
    payment = result.get('payment')

    if result['ok']:
        serializer = BookingSerializer(booking, context={'request': request})
        return Response(
            {
                'booking': serializer.data,
                'payment_status': payment.status if payment else '',
                'message': result['message'],
            },
            status=result['http_status'],
        )

    response_payload = {'error': result['message'], 'status': result['result_status'], 'error_code': result['error_code']}
    if booking:
        response_payload['booking'] = BookingSerializer(booking, context={'request': request}).data
    return Response(response_payload, status=result['http_status'])


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def esewa_callback(request, flow=None, booking_id=None, guide_id=None, transaction_uuid=None, total_amount=None):
    extraction = _extract_esewa_callback_data(request)
    target_url = _get_frontend_callback_url()
    flow = (flow or request.GET.get('flow') or request.POST.get('flow') or '').strip().lower()

    if booking_id and not extraction['callback_data'].get('booking_id'):
        extraction['callback_data']['booking_id'] = str(booking_id)
    if guide_id and not extraction['callback_data'].get('guide_id'):
        extraction['callback_data']['guide_id'] = str(guide_id)
    if transaction_uuid and not extraction['callback_data'].get('transaction_uuid'):
        extraction['callback_data']['transaction_uuid'] = str(transaction_uuid)
    if total_amount and not extraction['callback_data'].get('total_amount'):
        extraction['callback_data']['total_amount'] = str(total_amount)

    if extraction['decode_error']:
        redirect_params = _build_frontend_callback_payload(
            result_status='invalid',
            message='Sandbox response was invalid and could not be decoded.',
            transaction_uuid=str(extraction['callback_data'].get('transaction_uuid') or ''),
            status_code='invalid_payload',
        )
        return HttpResponseRedirect(_build_callback_redirect_url(target_url, redirect_params))

    callback_data = extraction['callback_data']
    raw_status = str(callback_data.get('status') or '').strip().upper()

    if not extraction['has_data_param'] and not callback_data.get('transaction_uuid'):
        if flow == 'failure' or raw_status in {'FAILURE', 'FAILED'}:
            result_status = 'failed'
            message = 'Payment failed or was interrupted before completion.'
            status_code = 'missing_failure_details'
        elif raw_status in {'CANCELLED', 'CANCELED'}:
            result_status = 'cancelled'
            message = 'Payment was cancelled before completion.'
            status_code = 'missing_cancelled_details'
        elif flow == 'success':
            result_status = 'failed'
            message = 'Payment could not be confirmed because the sandbox success response was missing payment details.'
            status_code = 'missing_success_details'
        else:
            result_status = 'failed'
            message = 'Payment could not be confirmed because the sandbox response was missing payment details.'
            status_code = 'missing_payment_details'
        redirect_params = _build_frontend_callback_payload(
            result_status=result_status,
            message=message,
            status_code=status_code,
        )
        return HttpResponseRedirect(_build_callback_redirect_url(target_url, redirect_params))

    result = _process_esewa_verification(callback_data)
    redirect_params = _build_frontend_callback_payload(
        result_status=result['result_status'],
        message=result['message'],
        booking=result.get('booking'),
        payment=result.get('payment'),
        transaction_uuid=str(callback_data.get('transaction_uuid') or transaction_uuid or ''),
        status_code=result['error_code'] or result['result_status'],
    )
    return HttpResponseRedirect(_build_callback_redirect_url(target_url, redirect_params))


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


@api_view(['GET'])
@authentication_classes([GuideTokenAuthentication])
@permission_classes([IsAuthenticated])
def my_reviews(request):
    """
    GET /api/guides/me/reviews/
    Returns all verified traveler reviews for the logged-in guide.
    """
    guide = get_guide_profile_or_none(request.user)
    if not guide:
        return Response({'error': 'Guide account required.'}, status=status.HTTP_403_FORBIDDEN)

    reviews = guide.reviews.select_related(
        'traveler', 'traveler__traveler_profile', 'booking'
    ).order_by('-created_at')

    serializer = ReviewSummarySerializer(reviews, many=True, context={'request': request})
    return Response({
        'rating': GuideProfileSerializer(guide, context={'request': request}).data['rating'],
        'review_count': reviews.count(),
        'rating_breakdown': build_review_breakdown(guide),
        'results': serializer.data,
    })

from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from .models import Destination
from .serializers import DestinationSerializer

class DestinationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class DestinationListView(generics.ListAPIView):
    queryset = Destination.objects.all().order_by('id')
    serializer_class = DestinationSerializer
    pagination_class = DestinationPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'location', 'description']

class DestinationDetailView(generics.RetrieveAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer

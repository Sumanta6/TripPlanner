from django.urls import path
from .views import DestinationListView, DestinationDetailView

urlpatterns = [
    path('', DestinationListView.as_view(), name='destination-list'),
    path('<int:pk>/', DestinationDetailView.as_view(), name='destination-detail'),
]

from rest_framework.routers import DefaultRouter

from .views import ProgramViewSet

router = DefaultRouter(trailing_slash=True)
router.register("programs", ProgramViewSet, basename="program")

urlpatterns = router.urls

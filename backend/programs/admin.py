"""
검증된 공고를 입력·관리하기 위한 관리 화면 등록.
관리자 계정은 만들어 두지 않는다. 운영자가 `python manage.py createsuperuser`로 직접 만든다.
"""

from django.contrib import admin

from .models import EligibilityRule, Program, RequiredDocument


class EligibilityRuleInline(admin.TabularInline):
    model = EligibilityRule
    extra = 0


class RequiredDocumentInline(admin.TabularInline):
    model = RequiredDocument
    extra = 0


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "agency", "reception_status", "apply_end", "verified_at")
    list_filter = ("reception_status", "stage", "agency_type")
    search_fields = ("id", "title", "ministry", "agency")
    inlines = [EligibilityRuleInline, RequiredDocumentInline]

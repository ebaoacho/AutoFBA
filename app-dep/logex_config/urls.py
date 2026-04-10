from django.contrib import admin
from django.urls import path

import sys
import os
import django

sys.path.append('/Django')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'logex_config.settings')
django.setup()
from logex_web_app import views

urlpatterns = [
    # Chatwork関連
    path('chatwork/register-room/', views.register_chatwork_room, name='register-chatwork-room'),
    path('chatwork/send-notification/', views.send_chatwork_notification, name='send-chatwork-notification'),
    
    # SKU設定データ関連
    path('sku-data/create/', views.sku_config_create, name='sku-config-create'),
    path('sku-data/all-sku-configs/', views.all_sku_configs, name='all-sku-configs'),
    path('sku-data/sku-config/<str:sku>/', views.sku_config_detail, name='sku-config-detail'),

    # 新規追加: 履歴・分析関連
    path('sku-data/sku-history/<str:sku>/', views.sku_config_history, name='sku-config-history'),
    path('sku-data/sku-analytics/<str:sku>/', views.sku_analytics, name='sku-analytics'),

    # 一括更新関連
    path('sku-data/bulk-update/', views.bulk_update_sku_data, name='bulk-update-sku-data'),

    # ✅ 新規追加: エクスポート機能
    path('sku-data/export-all/', views.export_all_sku_csv, name='export-all-sku-data'),
    
    path('auth/register/', views.auth_register, name='auth-register'),
    path('auth/login/', views.auth_login, name='auth-login'),
    path('auth/logout/', views.auth_logout, name='auth-logout'),
    path('auth/me/', views.auth_me, name='auth-me'),
    path('health/', views.health_check, name='health_check'),

    # SP-API接続状態
    path("spapi/connection-status/", views.spapi_connection_status, name="spapi-connection-status"),

    # SP-API LWA 認可フロー
    path("api/spapi/auth/start/", views.spapi_authorize_start, name="spapi-authorize-start"),
    path("api/spapi/auth/login/", views.spapi_authorize_login, name="spapi-authorize-login"),
    path("api/spapi/auth/callback/", views.spapi_authorize_callback, name="spapi-authorize-callback"),

    # SP-API統合エンドポイント
    path("api/spapi/save-refresh-token/", views.spapi_save_refresh_token, name="spapi-save-refresh-token"),
    path("api/spapi/inventory/", views.spapi_get_inventory, name="spapi-get-inventory"),
    path("api/spapi/fees-estimate/", views.spapi_get_fees_estimate, name="spapi-get-fees-estimate"),
    path("api/spapi/report/create/", views.spapi_create_report, name="spapi-create-report"),
    path("api/spapi/report/<str:report_id>/", views.spapi_get_report_status, name="spapi-get-report-status"),
    path("api/spapi/catalog/<str:asin>/", views.spapi_get_catalog_item, name="spapi-get-catalog-item"),
    path("api/spapi/orders/", views.spapi_get_orders, name="spapi-get-orders"),
    path("api/spapi/financial-events/", views.spapi_get_financial_events, name="spapi-get-financial-events"),
]

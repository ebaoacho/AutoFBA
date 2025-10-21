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
    path('health/', views.health_check, name='health_check')
]

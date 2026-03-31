'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CanAccessProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  role?: string;
  permission?: string;
  resource?: string;
  action?: string;
}

/**
 * 역할/권한 기반 접근 제어 게이트
 * React.memo로 감싸서 auth 상태 변경 시에만 리렌더
 */
const CanAccess = React.memo(function CanAccess({
  children,
  fallback = null,
  role,
  permission,
  resource,
  action,
}: CanAccessProps) {
  const { hasRole, hasPermission, checkAccess } = useAuth();

  let hasAccess = true;

  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  if (resource && action) {
    hasAccess = hasAccess && checkAccess(resource, action);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
});

export default CanAccess;

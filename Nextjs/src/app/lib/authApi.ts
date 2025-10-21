// app/lib/authApi.ts
import { apiFetch } from './http';

export type Me = {
  id: number;
  username: string;   // = email と同値運用
  email: string;
  first_name?: string; // ニックネーム用途
};

export async function registerApi(input: {
  email: string;
  password: string;
  nickname: string;
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/auth/register/', {
    method: 'POST',
    json: input,
  });
}

export async function loginApi(input: {
  email: string;
  password: string;
}): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/auth/login/', {
    method: 'POST',
    json: input,
  });
}

export async function logoutApi(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/auth/logout/', {
    method: 'POST',
  });
}

export async function meApi(): Promise<Me> {
  return apiFetch<Me>('/auth/me/');
}

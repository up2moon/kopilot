const authStorageKey = 'kopilot.auth'

export function getStoredAuth() {
  try {
    const savedAuth = window.localStorage.getItem(authStorageKey)

    return savedAuth ? JSON.parse(savedAuth) : null
  } catch {
    return null
  }
}

export function saveAuth(auth) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(auth))
}

export function clearAuth() {
  window.localStorage.removeItem(authStorageKey)
}

async function requestAuth(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = response.status === 204 ? null : await response.json()

  if (!response.ok) {
    throw new Error(data?.message || '요청 처리 중 오류가 발생했습니다.')
  }

  return data
}

export async function signup(payload) {
  return requestAuth('/api/auth/signup', payload)
}

export async function login(payload) {
  return requestAuth('/api/auth/login', payload)
}

export async function refresh(refreshToken) {
  return requestAuth('/api/auth/refresh', {
    refreshToken,
  })
}

export async function logout(refreshToken) {
  await requestAuth('/api/auth/logout', {
    refreshToken,
  })
}

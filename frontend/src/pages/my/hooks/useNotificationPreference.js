import { useState } from 'react'

const notificationsStorageKey = 'kopilot.notificationsEnabled'

function getStoredNotifications() {
  try {
    return window.localStorage.getItem(notificationsStorageKey) !== 'false'
  } catch {
    return true
  }
}

export default function useNotificationPreference() {
  const [notificationsOn, setNotificationsOn] = useState(
    getStoredNotifications,
  )

  const toggleNotifications = () => {
    setNotificationsOn((currentValue) => {
      const nextValue = !currentValue

      try {
        window.localStorage.setItem(
          notificationsStorageKey,
          String(nextValue),
        )
      } catch {
        // 저장 실패 시에도 현재 화면의 토글 상태는 유지한다.
      }

      return nextValue
    })
  }

  return [notificationsOn, toggleNotifications]
}

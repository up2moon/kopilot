export default function DisconnectMyDataDialog({
  open,
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="mypage-modal-backdrop" onClick={onCancel}>
      <div
        className="mypage-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disconnect-mydata-title"
        aria-describedby="disconnect-mydata-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mypage-modal-title" id="disconnect-mydata-title">
          마이데이터 연동 해제
        </h3>
        <p className="mypage-modal-text" id="disconnect-mydata-description">
          연동을 해제하면 불러온 소비 내역이 삭제돼요. 해제할까요?
        </p>
        <div className="mypage-modal-actions">
          <button
            type="button"
            className="mypage-modal-cancel"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="mypage-modal-danger"
            onClick={onConfirm}
          >
            연동 해제
          </button>
        </div>
      </div>
    </div>
  )
}

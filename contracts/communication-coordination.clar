;; Communication Coordination Contract
;; Coordinates crisis communications across channels

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u400))
(define-constant ERR_MESSAGE_NOT_FOUND (err u401))
(define-constant ERR_INVALID_CHANNEL (err u402))

;; Data structures
(define-map communication-messages
  { message-id: (string-ascii 50) }
  {
    brand-id: (string-ascii 50),
    crisis-id: (string-ascii 50),
    message-type: (string-ascii 30),
    content: (string-ascii 2000),
    target-channels: (list 5 (string-ascii 30)),
    priority: uint,
    scheduled-time: uint,
    sent-time: uint,
    status: (string-ascii 20),
    created-by: principal,
    approved-by: (optional principal)
  }
)

(define-map channel-configurations
  { brand-id: (string-ascii 50), channel: (string-ascii 30) }
  {
    active: bool,
    auto-post: bool,
    approval-required: bool,
    response-template: (string-ascii 500),
    contact-info: (string-ascii 200)
  }
)

(define-map stakeholder-communications
  { stakeholder-id: (string-ascii 50) }
  {
    stakeholder-type: (string-ascii 30),
    contact-method: (string-ascii 30),
    priority-level: uint,
    last-contacted: uint,
    communication-history: (list 10 (string-ascii 100))
  }
)

(define-data-var message-counter uint u0)

;; Public functions
(define-public (setup-channel-config
  (brand-id (string-ascii 50))
  (channel (string-ascii 30))
  (auto-post bool)
  (approval-required bool)
  (response-template (string-ascii 500))
  (contact-info (string-ascii 200)))
  (begin
    (map-set channel-configurations
      { brand-id: brand-id, channel: channel }
      {
        active: true,
        auto-post: auto-post,
        approval-required: approval-required,
        response-template: response-template,
        contact-info: contact-info
      }
    )
    (ok true)
  )
)

(define-public (create-communication-message
  (brand-id (string-ascii 50))
  (crisis-id (string-ascii 50))
  (message-type (string-ascii 30))
  (content (string-ascii 2000))
  (target-channels (list 5 (string-ascii 30)))
  (priority uint)
  (scheduled-time uint))
  (let ((message-id (int-to-ascii (var-get message-counter))))
    (map-set communication-messages
      { message-id: message-id }
      {
        brand-id: brand-id,
        crisis-id: crisis-id,
        message-type: message-type,
        content: content,
        target-channels: target-channels,
        priority: priority,
        scheduled-time: scheduled-time,
        sent-time: u0,
        status: "draft",
        created-by: tx-sender,
        approved-by: none
      }
    )
    (var-set message-counter (+ (var-get message-counter) u1))
    (ok message-id)
  )
)

(define-public (approve-message (message-id (string-ascii 50)))
  (match (map-get? communication-messages { message-id: message-id })
    message-data
    (begin
      (map-set communication-messages
        { message-id: message-id }
        (merge message-data {
          status: "approved",
          approved-by: (some tx-sender)
        })
      )
      (ok true)
    )
    ERR_MESSAGE_NOT_FOUND
  )
)

(define-public (send-message (message-id (string-ascii 50)))
  (match (map-get? communication-messages { message-id: message-id })
    message-data
    (begin
      (asserts! (is-eq (get status message-data) "approved") ERR_UNAUTHORIZED)
      (map-set communication-messages
        { message-id: message-id }
        (merge message-data {
          status: "sent",
          sent-time: block-height
        })
      )
      (ok true)
    )
    ERR_MESSAGE_NOT_FOUND
  )
)

(define-public (register-stakeholder
  (stakeholder-id (string-ascii 50))
  (stakeholder-type (string-ascii 30))
  (contact-method (string-ascii 30))
  (priority-level uint))
  (begin
    (map-set stakeholder-communications
      { stakeholder-id: stakeholder-id }
      {
        stakeholder-type: stakeholder-type,
        contact-method: contact-method,
        priority-level: priority-level,
        last-contacted: u0,
        communication-history: (list)
      }
    )
    (ok true)
  )
)

(define-public (update-stakeholder-contact (stakeholder-id (string-ascii 50)) (message-ref (string-ascii 100)))
  (match (map-get? stakeholder-communications { stakeholder-id: stakeholder-id })
    stakeholder-data
    (let ((updated-history (unwrap-panic (as-max-len?
      (append (get communication-history stakeholder-data) message-ref) u10))))
      (map-set stakeholder-communications
        { stakeholder-id: stakeholder-id }
        (merge stakeholder-data {
          last-contacted: block-height,
          communication-history: updated-history
        })
      )
      (ok true)
    )
    ERR_MESSAGE_NOT_FOUND
  )
)

;; Read-only functions
(define-read-only (get-communication-message (message-id (string-ascii 50)))
  (map-get? communication-messages { message-id: message-id })
)

(define-read-only (get-channel-config (brand-id (string-ascii 50)) (channel (string-ascii 30)))
  (map-get? channel-configurations { brand-id: brand-id, channel: channel })
)

(define-read-only (get-stakeholder-info (stakeholder-id (string-ascii 50)))
  (map-get? stakeholder-communications { stakeholder-id: stakeholder-id })
)

(define-read-only (get-message-count)
  (var-get message-counter)
)

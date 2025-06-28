;; Crisis Manager Verification Contract
;; Validates and manages crisis managers for brands

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ALREADY_VERIFIED (err u101))
(define-constant ERR_NOT_FOUND (err u102))
(define-constant ERR_INVALID_CREDENTIALS (err u103))

;; Data structures
(define-map crisis-managers
  { manager: principal }
  {
    verified: bool,
    specialization: (string-ascii 50),
    experience-years: uint,
    certifications: (list 5 (string-ascii 30)),
    reputation-score: uint,
    active-cases: uint,
    verification-date: uint
  }
)

(define-map brand-manager-assignments
  { brand-id: (string-ascii 50), manager: principal }
  {
    assigned-date: uint,
    status: (string-ascii 20),
    contract-terms: (string-ascii 200)
  }
)

(define-data-var total-verified-managers uint u0)

;; Public functions
(define-public (register-crisis-manager
  (specialization (string-ascii 50))
  (experience-years uint)
  (certifications (list 5 (string-ascii 30))))
  (let ((manager tx-sender))
    (asserts! (is-none (map-get? crisis-managers { manager: manager })) ERR_ALREADY_VERIFIED)
    (map-set crisis-managers
      { manager: manager }
      {
        verified: false,
        specialization: specialization,
        experience-years: experience-years,
        certifications: certifications,
        reputation-score: u0,
        active-cases: u0,
        verification-date: u0
      }
    )
    (ok true)
  )
)

(define-public (verify-manager (manager principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (match (map-get? crisis-managers { manager: manager })
      manager-data
      (begin
        (map-set crisis-managers
          { manager: manager }
          (merge manager-data {
            verified: true,
            verification-date: block-height
          })
        )
        (var-set total-verified-managers (+ (var-get total-verified-managers) u1))
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

(define-public (assign-manager-to-brand
  (brand-id (string-ascii 50))
  (manager principal)
  (contract-terms (string-ascii 200)))
  (let ((manager-data (unwrap! (map-get? crisis-managers { manager: manager }) ERR_NOT_FOUND)))
    (asserts! (get verified manager-data) ERR_UNAUTHORIZED)
    (map-set brand-manager-assignments
      { brand-id: brand-id, manager: manager }
      {
        assigned-date: block-height,
        status: "active",
        contract-terms: contract-terms
      }
    )
    (ok true)
  )
)

(define-public (update-reputation-score (manager principal) (new-score uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (match (map-get? crisis-managers { manager: manager })
      manager-data
      (begin
        (map-set crisis-managers
          { manager: manager }
          (merge manager-data { reputation-score: new-score })
        )
        (ok true)
      )
      ERR_NOT_FOUND
    )
  )
)

;; Read-only functions
(define-read-only (get-manager-info (manager principal))
  (map-get? crisis-managers { manager: manager })
)

(define-read-only (is-manager-verified (manager principal))
  (match (map-get? crisis-managers { manager: manager })
    manager-data (get verified manager-data)
    false
  )
)

(define-read-only (get-brand-assignment (brand-id (string-ascii 50)) (manager principal))
  (map-get? brand-manager-assignments { brand-id: brand-id, manager: manager })
)

(define-read-only (get-total-verified-managers)
  (var-get total-verified-managers)
)

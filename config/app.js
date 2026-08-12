module.exports = {
  company: {
    name: process.env.COMPANY_NAME || 'KKeyQik Private Limited',
    address: process.env.COMPANY_ADDRESS || 'H-235 A, Sector-12, Pratap Vihar, Ghaziabad - 201009',
    cin: process.env.COMPANY_CIN || 'U73100UP2025PTC224880',
    gstin: process.env.COMPANY_GSTIN || '09AALCK9039M1ZP',
    signatory: process.env.COMPANY_SIGNATORY || 'Naman Agarwal - Director',
    email: process.env.COMPANY_EMAIL || 'contact@kkeyqik.com',
    phone: process.env.COMPANY_PHONE || '+91 9711120165'
  },
  CONTRACT_STATUS: {
    DRAFT: 'draft',
    SENT: 'sent',
    OPENED: 'opened',
    FILLED: 'filled',
    SIGNED: 'signed',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  },
  PAYMENT_TYPES: {
    FULL_ADVANCE: 'FULL_ADVANCE',
    MONTHLY_RETAINER: 'MONTHLY_RETAINER',
    MONTHLY_ONE_TIMER: 'MONTHLY_ONE_TIMER',
    CUSTOM_SPLIT: 'CUSTOM_SPLIT',
    MILESTONE: 'MILESTONE'
  },
  DEFAULT_CLAUSES: [
    { id: 'confidentiality', title: 'Confidentiality', content: 'Both parties agree to maintain strict confidentiality regarding all proprietary information.' },
    { id: 'termination', title: 'Termination', content: 'Either party may terminate this agreement with 30 days written notice.' },
    { id: 'liability', title: 'Limitation of Liability', content: 'Liability shall be limited to the total amount paid under this contract.' }
  ]
};

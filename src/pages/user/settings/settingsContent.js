// All the written text of the Settings page in ONE place, so it can be
// edited without touching any component.
//
// NOTE: the Terms below are a plain-language draft that matches how SnapWall
// works today. Have them reviewed (ideally by a lawyer) before launch, and
// update TERMS_UPDATED whenever they change.

// Where "Contact support" goes. Set VITE_SUPPORT_EMAIL in the frontend .env.
export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || "support@snapwall.app";

export const TERMS_UPDATED = "15 October 2026";

export const TERMS = [
  {
    title: "1. Using SnapWall",
    body: [
      "SnapWall is a shared wall made of numbered spaces. Each space can hold one Snap: a photo with a caption, and optionally a place and a Time Capsule date.",
      "By creating an account or using SnapWall you agree to these terms. If you do not agree, please do not use the service.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You are responsible for your account and for keeping your sign-in details safe. Tell us straight away if you think someone else has used your account.",
      "Your username is public. Please choose one that does not impersonate someone else or break the community guidelines.",
    ],
  },
  {
    title: "3. Your Snaps and memories",
    body: [
      "You own the photos and captions you post. By posting, you give SnapWall permission to store and show them on the wall, in other people's Liked and Saved lists, and in share links, for as long as the Snap exists.",
      "Only post photos you have the right to share, and nothing that shows someone in a private moment without their consent.",
      "You can hide a Snap (it stays yours but nobody else sees it), edit its caption, location or Time Capsule date, or delete it at any time.",
    ],
  },
  {
    title: "4. Spaces and payments",
    body: [
      "A space is bought with a one-time payment and stays yours until you delete your Snap or your account.",
      "If your payment goes through but the space was taken by someone else first, your payment is refunded automatically.",
      "Deleting a Snap, or your account, frees the space for other people and does not give you a refund, because the payment already bought you that space for as long as you kept it.",
      "Payments are processed by our payment partner. We never see or store your card details.",
    ],
  },
  {
    title: "5. Time Capsules",
    body: [
      "A Time Capsule keeps its photo and caption hidden from everyone, including its place on the wall, until the date you choose. It then opens automatically and you are notified.",
      "A capsule that is still sealed when its owner's account is deleted is deleted too and will never open.",
    ],
  },
  {
    title: "6. Community rules and moderation",
    body: [
      "Anyone can report a Snap that breaks the community guidelines. Our moderators review reports and may hide or remove a Snap, and may do so without a refund.",
      "Accounts that repeatedly break the rules may be limited or closed.",
    ],
  },
  {
    title: "7. Your privacy",
    body: [
      "We only show other people what you choose to share. Your email address, bio and payment details are never shown to other users.",
      "You can control your photo, location and notifications in Settings > Privacy.",
    ],
  },
  {
    title: "8. Deleting your account",
    body: [
      "You can ask us to permanently delete your account in Settings. You have 30 days to change your mind; after that your Snaps and profile are permanently deleted and cannot be recovered.",
      "We keep payment records for as long as the law requires for accounting and tax, without a profile attached to them.",
    ],
  },
  {
    title: "9. Service and changes",
    body: [
      "We work hard to keep SnapWall running but cannot promise it will always be available or free of errors.",
      "We may update these terms from time to time. If a change matters, we will let you know in the app. Continuing to use SnapWall after a change means you accept it.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these terms? Use Help & Support in Settings and we will get back to you.",
    ],
  },
];

export const FAQS = [
  {
    q: "How do I post a Snap?",
    a: "Open the wall, tap an available space, and choose Post. You pay once for the space, then add your photo, caption and, if you like, a place or a Time Capsule date.",
  },
  {
    q: "What is a Time Capsule?",
    a: "It is a Snap that stays sealed until a date you pick. Until then nobody can see the photo or caption. When the date arrives it opens by itself and you get a notification.",
  },
  {
    q: "Can I change or hide a Snap after posting?",
    a: "Yes. From your Profile you can edit the caption, place or Time Capsule date, hide a Snap so only you can see it, or delete it.",
  },
  {
    q: "I paid but my Snap was not posted. What now?",
    a: "Open Payment History. Any payment that has not been used shows a button to finish posting, so you are never charged twice. If the space was taken meanwhile, you are refunded automatically.",
  },
  {
    q: "Do I get a refund if I delete my Snap?",
    a: "No. The payment bought the space for as long as you kept your Snap. Deleting it frees the space for someone else.",
  },
  {
    q: "Why was my Snap hidden?",
    a: "Our moderators hide Snaps that were reported and break the community guidelines. You get a notification when this happens. If you think it was a mistake, contact support from this page.",
  },
  {
    q: "How do I report a Snap?",
    a: "Open the Snap and use the report option. Pick a reason and our moderators will take a look.",
  },
  {
    q: "How do I change my username or photo?",
    a: "Go to Profile > Edit profile. Usernames are unique, and we check that yours is free as you type.",
  },
];

export const GUIDELINES = [
  "Be kind. No harassment, bullying, hate or threats toward anyone.",
  "Only post photos you have the right to share, and respect other people's privacy.",
  "No nudity, sexual content, graphic violence or anything illegal.",
  "No spam, scams or advertising that has nothing to do with your memory.",
  "Do not pretend to be someone else.",
  "Report Snaps that break these rules instead of replying to them.",
];

export const PROBLEM_CATEGORIES = [
  { value: "bug", label: "Something is not working" },
  { value: "payment", label: "A payment problem" },
  { value: "account", label: "My account" },
  { value: "other", label: "Something else" },
];
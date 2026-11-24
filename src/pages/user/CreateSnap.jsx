import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";
import {
  HiArrowLeft,
  HiPhotograph,
  HiCloudUpload,
  HiLightningBolt,
  HiClock,
  HiExclamationCircle,
  HiX,
  HiCreditCard,
  HiCheckCircle,
} from "react-icons/hi";

import { compressImage } from "../../utils/compressImage";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  loadDraftImage,
  saveDraftImage,
  deleteDraftImage,
} from "../../utils/snapDraft";
import {
  uploadSnapImage,
  validateImage,
  MAX_SNAP_MB,
} from "../../services/storageService";
import {
  createSpaceOrder,
  releaseSpace,
  verifyPayment,
} from "../../services/paymentService";
import { getTheLockerSettings } from "../../services/settingsApi";
import { loadRazorpay } from "../../utils/loadRazorpay";
import { useAuth } from "../../context/AuthContext";
import LocationPicker from "../../components/snap/LocationPicker";
import LockerPicker, {
  MIN_LOCK_MINUTES,
} from "../../components/snap/LockerPicker";
import { toLocalInputValue } from "../../utils/countdown";

import "./CreateSnap.css";
import { API_BASE_URL } from "../../config";

const SNAP_TYPES = [
  {
    value: "post",
    title: "Post Now",
    hint: "Show it on the wall right away",
    Icon: HiLightningBolt,
  },
  {
    value: "capsule",
    title: "Time Capsule",
    hint: "Lock it until a date you choose",
    Icon: HiClock,
  },
];

// CHANGED: caption limit is 100 characters (was 500). Keep in sync with the
// same limit in backend snapController.js.
const MAX_CAPTION = 100;


// What the button says while each step is running.
const STAGE_LABELS = {
  order: "Preparing payment...",
  paying: "Complete the payment...",
  confirming: "Confirming payment...",
  uploading: "Uploading photo...",
  posting: "Posting...",
};

function CreateSnap() {
  const { currentUser, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const selectedSpace = location.state?.space;

  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [snapType, setSnapType] = useState("post");
  // NEW: which step of "pay -> upload -> post" is running ("idle" = none)
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);

  // NEW: where the photo was captured (optional) + locker date/time
  const [snapLocation, setSnapLocation] = useState(null);
  const [unlockAt, setUnlockAt] = useState(""); // "YYYY-MM-DDTHH:mm", local time

  // NEW — payment
  // price: what a space costs (display only; the server decides the amount)
  // paymentId: set once the space is PAID FOR. From then on the person is
  //   never charged again for this Snap — if a later step fails (network,
  //   upload...) pressing the button again just finishes posting. It can also
  //   arrive from Payment History ("Finish posting").
  // NEW: a bid winner arrives with their winning amount (display only — the
  // server decides what is really charged).
  const bidAmount = Number(location.state?.bidAmount) || 0;
  const [price, setPrice] = useState(bidAmount || null);
  const [paymentId, setPaymentId] = useState(location.state?.paymentId || "");
  const pendingVerifyRef = useRef(null); // paid in Razorpay, not yet confirmed by our server
  const uploadedRef = useRef(null); // { file, downloadURL, storagePath } — never upload twice

  const busy = stage !== "idle";

  // NEW: upload progress (0–100), whether a photo is being optimised, and
  // whether we put back an unfinished Snap after a refresh.
  const [uploadPercent, setUploadPercent] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const uid = currentUser?.uid;
  const spaceKey = selectedSpace?.id;

  // NEW: the error is shown at the bottom, right above the button. Scroll it
  // into view whenever a new error appears so nobody misses it.
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  // Free the preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // NEW: the price shown on the button / payment box
  useEffect(() => {
    let cancelled = false;

    getTheLockerSettings()
      .then((settings) => {
        const value = Number(settings?.spacePrice);

        // CHANGED: a bid winner keeps seeing their winning amount.
        if (!cancelled && value > 0 && !bidAmount) setPrice(value);
      })
      .catch(() => {
        // Not fatal: the button just won't show an amount.
      });

    return () => {
      cancelled = true;
    };
  }, [bidAmount]);

  // NEW: put back an unfinished Snap (text, photo, and the payment that was
  // already made) after a refresh or a closed tab.
  useEffect(() => {
    if (!uid || !spaceKey) return;

    let cancelled = false;

    (async () => {
      const draft = loadDraft(uid, spaceKey);
      const file = await loadDraftImage(uid, spaceKey);

      if (cancelled) return;

      if (draft) {
        setCaption(draft.caption || "");
        setSnapType(draft.snapType || "post");
        setSnapLocation(draft.snapLocation || null);
        setUnlockAt(draft.unlockAt || "");
        // a payment id handed in from Payment History wins over the saved one
        setPaymentId((current) => current || draft.paymentId || "");

        if (draft.pendingVerify) pendingVerifyRef.current = draft.pendingVerify;
      }

      if (file) {
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
      }

      if (draft || file) setRestored(true);

      setDraftReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, spaceKey]);

  // NEW: keep the draft up to date as the person types and pays.
  useEffect(() => {
    if (!draftReady || !uid || !spaceKey) return;

    saveDraft(uid, spaceKey, {
      caption,
      snapType,
      snapLocation,
      unlockAt,
      paymentId,
    });
  }, [draftReady, uid, spaceKey, caption, snapType, snapLocation, unlockAt, paymentId]);

  // NEW: warn before a refresh / closing the tab while a payment or upload
  // is in progress. (After paying, the box is reserved — people may leave
  // and post later — so there is no warning once nothing is running.)
  useEffect(() => {
    if (!busy) return;

    function warn(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  if (!selectedSpace) {
    return (
      <main className="createsnap">
        <div className="createsnap__card createsnap__card--empty">
          <div className="createsnap__empty-icon">
            <HiPhotograph />
          </div>

          <h1 className="createsnap__title">No space selected</h1>

          <p className="createsnap__subtitle">
            Please select an available space from The Locker first.
          </p>

          <button
            type="button"
            className="createsnap__btn createsnap__btn--primary"
            onClick={() => navigate("/wall")}
          >
            <HiArrowLeft />
            Back to The Locker
          </button>
        </div>
      </main>
    );
  }

  // NEW: leaving after paying would strand the payment — warn first.
  // (It isn't lost: Payment History has a "Finish posting" button.)
  function handleLeave() {
    if (
      paymentId &&
      !window.confirm(
        "You've already paid for this space. If you leave now your Snap won't be posted yet. You can finish it later from Payment History. Leave anyway?"
      )
    ) {
      return;
    }

    navigate("/wall");
  }

  // NEW: pays for the space with Razorpay.
  //   1. our server checks the space is free, holds it, creates the order
  //   2. Razorpay's window opens
  //   3. our server verifies the payment and records it
  // Resolves to the verified payment id, or null if the person closed the
  // window. Throws if something broke.
  async function collectPayment() {
    // A payment that went through earlier but couldn't be confirmed
    // (e.g. the connection dropped): confirm THAT one — never charge twice.
    if (pendingVerifyRef.current) {
      setStage("confirming");

      const verified = await verifyPayment(pendingVerifyRef.current);

      pendingVerifyRef.current = null;

      return verified.paymentId;
    }

    setStage("order");

    let order;
    let keyId;
    let Razorpay;

    try {
      [{ order, keyId }, Razorpay] = await Promise.all([
        createSpaceOrder(selectedSpace.id),
        loadRazorpay(),
      ]);
    } catch (err) {
      // NEW: they already paid for this space earlier (e.g. before a
      // refresh). Don't charge again — carry on with that payment.
      if (err.code === "ALREADY_PAID" && err.paymentId) {
        return err.paymentId;
      }

      throw err;
    }

    return new Promise((resolve, reject) => {
      let succeeded = false;

      const checkout = new Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "The Locker",
        description: `Space ${selectedSpace.id}`,
        prefill: {
          name: profile?.displayName || currentUser?.displayName || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#b4502a" },

        // Paid in the window — now our server must confirm it.
        handler: async (response) => {
          succeeded = true;

          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          try {
            setStage("confirming");
            setError("");

            const verified = await verifyPayment(payload);

            resolve(verified.paymentId);
          } catch {
            // Keep it, so the next press confirms this payment again.
            pendingVerifyRef.current = payload;
            // NEW: remember it, so a refresh can still confirm this payment
            saveDraft(uid, spaceKey, { pendingVerify: payload });

            reject(
              new Error(
                "Your payment went through, but we couldn't confirm it yet. Press the button again — you won't be charged twice."
              )
            );
          }
        },

        modal: {
          // Closed the window without paying: free the space for others.
          ondismiss: () => {
            if (succeeded) return;

            releaseSpace(selectedSpace.id).catch(() => {});
            resolve(null);
          },
        },
      });

      // A card/UPI attempt failed. The window stays open so they can retry.
      checkout.on("payment.failed", (response) => {
        setError(
          response?.error?.description || "Payment failed. Please try again."
        );
      });

      setStage("paying");
      checkout.open();
    });
  }

  async function applyFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    // NEW: check the size right when the photo is picked (not only on pay),
    // so the person knows straight away.
    try {
      validateImage(file);
    } catch (err) {
      setError(err.message);
      return;
    }

    setError("");

    // NEW: shrink big phone photos now, BEFORE paying — a huge file is what
    // made uploads time out. Falls back to the original if anything fails.
    setOptimizing(true);

    const ready = await compressImage(file);

    setOptimizing(false);

    setImage(ready);
    setPreviewUrl(URL.createObjectURL(ready));

    // NEW: remember the photo so a refresh doesn't lose it
    if (uid && spaceKey) saveDraftImage(uid, spaceKey, ready);
  }

  function handleImageChange(event) {
    applyFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  function handleRemoveImage() {
    setImage(null);
    setPreviewUrl("");

    if (uid && spaceKey) deleteDraftImage(uid, spaceKey);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // NEW: choosing Time Capsule opens the locker with a sensible default
  // (tomorrow, 9:00 AM) so the person only has to adjust it.
  function handleTypeChange(value) {
    setSnapType(value);
    setError("");

    if (value === "capsule" && !unlockAt) {
      const tomorrow = new Date();

      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      setUnlockAt(toLocalInputValue(tomorrow));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
      setError("Please login before creating a Snap.");
      return;
    }

    if (!image) {
      setError("Please select an image.");
      return;
    }

    // NEW: check the photo NOW — the upload happens after payment, so a
    // photo that is too big must be caught before any money moves.
    try {
      validateImage(image);
    } catch (err) {
      setError(err.message);
      return;
    }

    // NEW: the locker needs a valid future time
    let unlockDate = null;

    if (snapType === "capsule") {
      unlockDate = unlockAt ? new Date(unlockAt) : null;

      if (!unlockDate || Number.isNaN(unlockDate.getTime())) {
        setError("Pick the date and time your Time Capsule should open.");
        return;
      }

      if (unlockDate.getTime() < Date.now() + MIN_LOCK_MINUTES * 60000) {
        setError(
          `Pick an unlock time at least ${MIN_LOCK_MINUTES} minutes from now.`
        );
        return;
      }
    }

    // The id of a payment that has already gone through (this attempt or an
    // earlier one). If anything below fails, the person is told their
    // payment is safe and that pressing the button again won't charge them.
    let paidId = paymentId;

    try {
      setError("");

      // ---------- 1. Pay ----------
      if (!paidId) {
        paidId = await collectPayment();

        if (!paidId) {
          // Closed the window. Keep a "payment failed" message if there is one.
          setError(
            (previous) =>
              previous ||
              "Payment cancelled — your Snap hasn't been posted. You can try again."
          );
          return;
        }

        setPaymentId(paidId);
      }

      // ---------- 2. Upload the photo (once) ----------
      setStage("uploading");

      if (!uploadedRef.current || uploadedRef.current.file !== image) {
        setUploadPercent(0);

        const uploadResult = await uploadSnapImage(
          image,
          currentUser.uid,
          setUploadPercent
        );

        uploadedRef.current = { file: image, ...uploadResult };
      }

      const uploaded = uploadedRef.current;

      // ---------- 3. Post ----------
      setStage("posting");

      const idToken = await getIdToken(currentUser);

      const response = await fetch(`${API_BASE_URL}/api/snaps`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          spaceId: selectedSpace.id,
          imageUrl: uploaded.downloadURL,
          storagePath: uploaded.storagePath,
          caption,
          snapType,
          location: snapLocation,
          unlockAt: unlockDate ? unlockDate.toISOString() : undefined,

          // NEW: the server only accepts a verified payment for this space
          paymentId: paidId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const failure = new Error(data.message || "Failed to create Snap.");

        failure.refunded = data.refunded === true;

        throw failure;
      }

      // Posted: the draft is no longer needed.
      clearDraft(uid, spaceKey);

      // A locked capsule isn't on the wall yet — show it in Time Capsules.
      navigate(snapType === "capsule" ? "/profile?tab=capsules" : "/wall");
    } catch (err) {
      console.error("Create Snap failed:", err);

      const message = err.message || "Failed to create Snap.";

      if (err.refunded) {
        // The space was taken and the money has been returned automatically:
        // there is nothing left to retry.
        setPaymentId("");
        clearDraft(uid, spaceKey);
        setError(message);
      } else if (paidId && !pendingVerifyRef.current) {
        setError(
          // CHANGED: add a full stop if the message has none (it used to read
          // "...at most 10 years Your payment is safe").
          `${/[.!?]$/.test(message) ? message : `${message}.`} Your payment is safe — press the button again to finish. You won't be charged twice.`
        );
      } else {
        setError(message);
      }
    } finally {
      setStage("idle");
    }
  }

  return (
    <main className="createsnap">
      <div className="createsnap__card">
        <button
          type="button"
          className="createsnap__back"
          onClick={handleLeave}
          disabled={busy}
        >
          <HiArrowLeft />
          Back to wall
        </button>

        <header className="createsnap__header">
          <span className="createsnap__chip">
            Space <strong>{selectedSpace.id}</strong>
          </span>

          <h1 className="createsnap__title">Create your Snap</h1>

          <p className="createsnap__subtitle">
            Pick a photo, add a few words, and place your memory on The Locker.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="createsnap__form">
          {/* NEW: shown after a refresh, when we put back an unfinished Snap */}
          {restored && (
            <div className="createsnap__restored" role="status">
              <HiCheckCircle />
              <span>
                We saved your unfinished Snap and put it back
                {paymentId
                  ? " — your payment is already received, just press the button to finish."
                  : "."}
              </span>
            </div>
          )}

          {/* ---------- Photo ---------- */}
          <section className="createsnap__section">
            <span className="createsnap__label">Photo</span>

            {optimizing && (
              <p className="createsnap__hint-line">Getting your photo ready...</p>
            )}

            <input
              ref={fileInputRef}
              id="snap-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="createsnap__file"
            />

            {previewUrl ? (
              <div className="createsnap__preview">
                <div className="createsnap__polaroid">
                  <img src={previewUrl} alt="Snap preview" />
                </div>

                <div className="createsnap__preview-actions">
                  <label
                    htmlFor="snap-image"
                    className="createsnap__btn createsnap__btn--soft"
                  >
                    Change photo
                  </label>

                  <button
                    type="button"
                    className="createsnap__btn createsnap__btn--ghost"
                    onClick={handleRemoveImage}
                  >
                    <HiX />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="snap-image"
                className={`createsnap__drop ${
                  dragging ? "is-dragging" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <span className="createsnap__drop-icon">
                  <HiCloudUpload />
                </span>

                <span className="createsnap__drop-title">
                  {dragging ? "Release to add your photo" : "Drop a photo here"}
                </span>

                <span className="createsnap__drop-hint">
                  or <u>browse from your device</u>
                </span>

                {/* NEW: same limits the upload enforces (storageService.js) */}
                <span className="createsnap__drop-note">
                  JPG, PNG or WebP · up to {MAX_SNAP_MB} MB
                </span>
              </label>
            )}
          </section>

          {/* ---------- Caption ---------- */}
          <section className="createsnap__section">
            <div className="createsnap__label-row">
              <label htmlFor="snap-caption" className="createsnap__label">
                Caption
              </label>

              <span className="createsnap__counter">
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>

            <textarea
              id="snap-caption"
              className="createsnap__textarea"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write something about this memory..."
              maxLength={MAX_CAPTION}
              rows={4}
            />
          </section>

          {/* ---------- Location (NEW) ---------- */}
          <section className="createsnap__section">
            <div className="createsnap__label-row">
              <span className="createsnap__label">Country</span>
              <span className="createsnap__counter">Optional</span>
            </div>

            <LocationPicker value={snapLocation} onChange={setSnapLocation} />
          </section>

          {/* ---------- Snap type ---------- */}
          <section className="createsnap__section">
            <span className="createsnap__label">Snap type</span>

            <div className="createsnap__types">
              {SNAP_TYPES.map(({ value, title, hint, Icon }) => (
                <label
                  key={value}
                  className={`createsnap__type ${
                    snapType === value ? "is-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="snapType"
                    value={value}
                    checked={snapType === value}
                    onChange={() => handleTypeChange(value)}
                    className="createsnap__type-input"
                  />

                  <span className="createsnap__type-icon">
                    <Icon />
                  </span>

                  <span className="createsnap__type-title">{title}</span>
                  <span className="createsnap__type-hint">{hint}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ---------- Locker (NEW — Time Capsule only) ---------- */}
          {snapType === "capsule" && (
            <LockerPicker value={unlockAt} onChange={setUnlockAt} />
          )}

          {/* ---------- Payment (NEW) ---------- */}
          <section
            className={`createsnap__pay ${paymentId ? "is-paid" : ""}`}
            aria-live="polite"
          >
            <span className="createsnap__pay-icon">
              {paymentId ? <HiCheckCircle /> : <HiCreditCard />}
            </span>

            <div className="createsnap__pay-text">
              {paymentId ? (
                <>
                  <strong>Payment received</strong>
                  <span>
                    This space is yours. Finish posting below — you won't be
                    charged again.
                  </span>
                </>
              ) : (
                <>
                  <strong>
                    {price ? `₹${price} to claim this space` : "Claim this space"}
                  </strong>
                  <span>
                    You'll pay securely with Razorpay when you press the button.
                  </span>
                </>
              )}
            </div>
          </section>

          {/* CHANGED: error message moved down, right above the buttons */}
          {error && (
            <div className="createsnap__error" role="alert" ref={errorRef}>
              <HiExclamationCircle />
              <span>{error}</span>
            </div>
          )}

          {/* ---------- Actions ---------- */}
          <div className="createsnap__actions">
            <button
              type="button"
              className="createsnap__btn createsnap__btn--ghost"
              onClick={handleLeave}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="createsnap__btn createsnap__btn--primary"
              disabled={busy || optimizing}
            >
              {busy && <span className="createsnap__spinner" />}
              {busy
                ? stage === "uploading" && uploadPercent > 0
                  ? `Uploading photo... ${uploadPercent}%`
                  : STAGE_LABELS[stage]
                : `${!paymentId && price ? `Pay ₹${price} & ` : ""}${
                    snapType === "capsule" ? "Lock Snap" : "Post Snap"
                  }`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreateSnap;
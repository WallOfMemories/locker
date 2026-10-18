import { useSearchParams } from "react-router-dom";
import {
  FiChevronDown,
  FiFileText,
  FiHelpCircle,
  FiLock,
  FiShield,
  FiTrash2,
} from "react-icons/fi";

import SecuritySection from "./settings/SecuritySection";
import PrivacySection from "./settings/PrivacySection";
import TermsSection from "./settings/TermsSection";
import HelpSection from "./settings/HelpSection";
import DeleteAccountSection from "./settings/DeleteAccountSection";

import "./Settings.css";

// CHANGED: this page used to be a copy-pasted "My Snaps" placeholder. It now
// has the five Settings sections. Each one opens like an accordion, and
// /profile/settings?section=privacy opens one directly (handy for links).
const SECTIONS = [
  {
    id: "security",
    title: "Security",
    description: "Change password, manage authentication",
    icon: FiLock,
    Component: SecuritySection,
  },
  {
    id: "privacy",
    title: "Privacy",
    description:
      "Manage profile visibility, personal information, and available privacy controls.",
    icon: FiShield,
    Component: PrivacySection,
  },
  {
    id: "terms",
    title: "Terms of Use",
    description: "The rules for using SnapWall.",
    icon: FiFileText,
    Component: TermsSection,
  },
  {
    id: "help",
    title: "Help & Support",
    description:
      "Contact support, report a problem, and read FAQs and community guidelines.",
    icon: FiHelpCircle,
    Component: HelpSection,
  },
  {
    id: "delete",
    title: "Delete Account",
    description:
      "Request permanent account deletion with a clear explanation of what happens to your data and memories.",
    icon: FiTrash2,
    Component: DeleteAccountSection,
    danger: true,
  },
];

function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();

  const openId = searchParams.get("section");

  // Opening one closes the other; clicking the open one closes it.
  function toggle(id) {
    if (openId === id) {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ section: id }, { replace: true });
    }
  }

  return (
    <div className="settings">
      <header className="settings__header">
        <h1>Settings</h1>
        <p>Manage your account, your privacy and your data.</p>
      </header>

      <div className="settings__sections">
        {SECTIONS.map(({ id, title, description, icon: Icon, Component, danger }) => {
          const open = openId === id;

          return (
            <section
              key={id}
              className={`settings__section${open ? " is-open" : ""}${
                danger ? " settings__section--danger" : ""
              }`}
            >
              <button
                type="button"
                className="settings__head"
                onClick={() => toggle(id)}
                aria-expanded={open}
                aria-controls={`settings-panel-${id}`}
              >
                <span className="settings__icon">
                  <Icon />
                </span>

                <span className="settings__titles">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>

                <FiChevronDown className="settings__chevron" />
              </button>

              {/* Only the open section is mounted, so e.g. Delete Account
                  doesn't load anything until you actually open it. */}
              {open && (
                <div className="settings__panel" id={`settings-panel-${id}`}>
                  <Component />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Settings;
// The inquiry form: name, a way to reach you back, a message, and — when it was
// opened from a scent — the scent it is about.
//
// One implementation, mounted two ways: as the popup behind the Inquire button,
// and inline on the contact page.

// ---- Where inquiries go ----------------------------------------------------
// A static site cannot send mail on its own: nothing here may hold a mail
// password, since everything here is public. So the inquiry is POSTed to
// Web3Forms, which holds the credentials and forwards it to INQUIRY_EMAIL. The
// visitor never leaves the page.
//
// WEB3FORMS_KEY is the access key mailed back after entering the address at
// https://web3forms.com — it is a public identifier, safe to ship, and only
// ever delivers to the address it was issued for. Until it is set the form
// falls back to opening the visitor's own mail client, pre-filled.
const WEB3FORMS_KEY = ''; // TODO: paste the access key from the Web3Forms email
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
// Exported so the contact page can show the same address it writes to.
export const INQUIRY_EMAIL = 'aleksparfumy@gmail.com';

const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', autocomplete: 'name', required: true },
  {
    name: 'contact',
    label: 'Email or phone',
    type: 'text',
    autocomplete: 'email',
    required: true,
  },
];

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function looksLikeContact(value) {
  const v = value.trim();
  // Loose on purpose: digits, spaces, +, -, (), at least 6 digits.
  const phone = /^[+()\d\s-]{6,}$/.test(v) && (v.match(/\d/g) || []).length >= 6;
  return isEmail(v) || phone;
}

function subjectFor(scent) {
  return scent ? `Inquiry — ${scent}` : 'Message from the website';
}

function mailtoLink({ scent, name, contact, message }) {
  const body = [
    ...(scent ? [`Scent: ${scent}`] : []),
    `Name: ${name}`,
    `Email or phone: ${contact}`,
    '',
    message || '(no message)',
  ].join('\n');
  return `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent(subjectFor(scent))}` +
    `&body=${encodeURIComponent(body)}`;
}

/**
 * Builds the form. `heading` is the markup shown above the fields; pass the
 * scent heading for the popup, or a plain title for the contact page.
 */
export function createInquiryForm({ heading = '', sendLabel = 'Send inquiry' } = {}) {
  const form = document.createElement('form');
  form.className = 'inquiry-form';
  form.method = 'dialog';
  form.noValidate = true;
  form.innerHTML = `
    ${heading}
    ${FIELDS.map(({ name, label, type, autocomplete, required }) => `
      <label class="inquiry-field">
        <span>${label}${required ? '' : ' <em>(optional)</em>'}</span>
        <input type="${type}" name="${name}" autocomplete="${autocomplete}"
               ${required ? 'required' : ''}>
      </label>`).join('')}
    <label class="inquiry-field">
      <span>Message</span>
      <textarea name="message" rows="3"></textarea>
    </label>
    <!-- Web3Forms' honeypot: hidden from people, filled in by bots, and any
         submission carrying it is dropped before it becomes mail. -->
    <input type="checkbox" name="botcheck" class="inquiry-botcheck"
           tabindex="-1" autocomplete="off">
    <p class="inquiry-error" role="alert" hidden></p>
    <button class="inquiry-send" type="submit">${sendLabel}</button>
    <p class="inquiry-done" hidden></p>`;

  const errorEl = form.querySelector('.inquiry-error');
  const doneEl = form.querySelector('.inquiry-done');
  const sendButton = form.querySelector('.inquiry-send');
  // Empty on the contact page: the inquiry is not about one scent there.
  let scent = '';

  function fail(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function finish(message) {
    doneEl.textContent = message;
    doneEl.hidden = false;
    form.querySelectorAll('.inquiry-field, .inquiry-send')
      .forEach((el) => { el.hidden = true; });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;

    const data = Object.fromEntries(new FormData(form));
    const inquiry = {
      scent,
      name: (data.name || '').trim(),
      contact: (data.contact || '').trim(),
      message: (data.message || '').trim(),
    };

    if (!inquiry.name) return fail('Please add your name.');
    if (!looksLikeContact(inquiry.contact)) {
      return fail('Please add an email address or a phone number we can reach you on.');
    }

    if (!WEB3FORMS_KEY) {
      // No endpoint configured: hand off to the visitor's mail client. Done by
      // clicking a link rather than setting location, so the page itself is
      // never navigated away from.
      const link = document.createElement('a');
      link.href = mailtoLink(inquiry);
      link.rel = 'noopener';
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      finish('Your mail app should be opening with the inquiry ready to send.');
      return;
    }

    sendButton.disabled = true;
    sendButton.textContent = 'Sending…';
    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: subjectFor(scent),
          from_name: inquiry.name,
          // Becomes the reply-to on the mail, so answering it goes straight
          // back to them — but only when they gave an address rather than a
          // phone number; Web3Forms rejects anything else in this field.
          ...(isEmail(inquiry.contact) ? { email: inquiry.contact } : {}),
          // The rest are shown as-is in the body of the mail.
          Name: inquiry.name,
          'Email or phone': inquiry.contact,
          ...(inquiry.scent ? { Scent: inquiry.scent } : {}),
          Message: inquiry.message || '(no message)',
          botcheck: data.botcheck ? 'true' : '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      finish('Thank you — your message is on its way. We will be in touch.');
    } catch (err) {
      console.error('Inquiry failed to send:', err);
      fail(`Something went wrong sending that. Write to ${INQUIRY_EMAIL} instead.`);
      sendButton.disabled = false;
      sendButton.textContent = sendLabel;
    }
  });

  return {
    form,
    /** Back to a blank, sendable form. Pass the scent when there is one. */
    reset(scentName = '') {
      scent = scentName;
      form.reset();
      errorEl.hidden = true;
      doneEl.hidden = true;
      form.querySelectorAll('.inquiry-field, .inquiry-send')
        .forEach((el) => { el.hidden = false; });
      sendButton.disabled = false;
      sendButton.textContent = sendLabel;
    },
  };
}

/**
 * The popup behind an Inquire button. One dialog per use — the scent page and
 * the home page each keep their own — so `id` must be unique. The `title` is
 * the large line under the eyebrow; `open()` can override it and the subject
 * (e.g. with a scent name).
 */
export function initInquiry({
  eyebrow = 'Inquire about',
  title = '',
  subject = '',
  sendLabel = 'Send inquiry',
  id = 'inquiry',
} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'inquiry-dialog';
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  dialog.innerHTML = `
    <!-- the largest piece of the model, sitting behind the form -->
    <span class="shape shape--large inquiry-shape" aria-hidden="true"></span>
    <button class="inquiry-close" type="button" aria-label="Close">&times;</button>`;

  const { form, reset } = createInquiryForm({
    heading: `
      <p class="inquiry-eyebrow">${eyebrow}</p>
      <h2 class="inquiry-scent" id="${id}-title">${title}</h2>`,
    sendLabel,
  });
  dialog.append(form);
  document.body.append(dialog);

  const titleEl = form.querySelector('.inquiry-scent');
  dialog.querySelector('.inquiry-close').addEventListener('click', () => dialog.close());

  // Clicking the backdrop (i.e. outside the form) closes the dialog too.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return {
    open(label = title, subjectOverride = subject) {
      titleEl.textContent = label;
      reset(subjectOverride);
      dialog.showModal();
    },
  };
}

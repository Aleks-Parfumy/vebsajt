// The contact view: where to find us, and the inquiry form inline on the page
// rather than in a popup.

import { createInquiryForm, INQUIRY_EMAIL } from './inquiry.js';
import { initLogo } from './logo.js';

const LINKS = [
  {
    label: 'Instagram',
    handle: '@aleksparfumy',
    url: 'https://instagram.com/aleksparfumy',
  },
  {
    label: 'Facebook',
    handle: 'Aleks Parfumy',
    url: 'https://www.facebook.com/people/Aleks-Parfumy/61589426712095/',
  },
];

// `label` is the small uppercase line above the handle; the email needs none,
// since the heading over it already says what it is.
function linkItem({ label = '', handle, url, external = true }) {
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `
    <li>
      <a class="contact-link" href="${url}"${target}>
        ${label ? `<span class="contact-link-label">${label}</span>` : ''}
        <span class="contact-link-handle">${handle}</span>
      </a>
    </li>`;
}

export function initContact(root) {
  const linksEl = root.querySelector('#contact-links');
  const emailEl = root.querySelector('#contact-email');
  const formEl = root.querySelector('#contact-form');

  linksEl.innerHTML = LINKS.map((link) => linkItem(link)).join('');
  emailEl.innerHTML = linkItem({
    handle: INQUIRY_EMAIL,
    url: `mailto:${INQUIRY_EMAIL}`,
    external: false,
  });

  const { form, reset } = createInquiryForm({
    heading: '<h2 class="contact-form-title">Write to us</h2>',
    sendLabel: 'Send message',
  });
  formEl.append(form);
  reset();

  // The shining 3D monogram, drawn onto its own canvas in the left column. It
  // only runs while the contact view is open, kicked off by activate().
  const logo = initLogo(root.querySelector('#contact-logo-canvas'));

  return {
    activate: () => {
      reset();
      logo.activate();
    },
  };
}

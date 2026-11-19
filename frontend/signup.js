const form = document.querySelector('.signup');
const submit = form.querySelector('[type=submit]');
const email = form.elements.email;
const status = form.querySelector('[role=status]');
const caption = submit.querySelector('span');
const messages = {
  joined: "You're on the list.",
  'check-email': 'Check your email address and try again.',
  'try-again': 'Couldn’t save just now. Please try again.'
};

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true;
  caption.textContent = 'Saving…';
  status.textContent = '';
  email.removeAttribute('aria-invalid');
  // Freeze the submitted address until the server acknowledges it.
  const fields = new URLSearchParams(new FormData(form));
  email.readOnly = true;
  let state;
  try {
    const res = await fetch(form.action, {
      method: 'POST', body: fields, headers: { Accept: 'application/json' }
    });
    const result = await res.json();
    state = res.ok && result.state === 'joined' ? 'joined' :
      result.state === 'check-email' ? 'check-email' : 'try-again';
  } catch {
    state = 'try-again';
  } finally {
    email.readOnly = false;
    submit.disabled = false;
    caption.textContent = 'Notify me';
  }
  form.dataset.state = state;
  status.textContent = messages[state];
  if (state === 'joined') form.reset();
  if (state === 'check-email') {
    email.setAttribute('aria-invalid', 'true');
    email.focus();
  }
});
email.addEventListener('input', () => {
  email.removeAttribute('aria-invalid');
  delete form.dataset.state;
  status.textContent = '';
  if (['#joined', '#check-email', '#try-again'].includes(location.hash)) {
    history.replaceState(null, '', location.pathname + location.search);
  }
});

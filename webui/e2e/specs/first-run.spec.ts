import { test, expect } from '../harness/fixtures';

test.describe('first run', () => {
  test('completes first-run setup with auth left disabled', async ({ page, backrest }) => {
    await page.goto(backrest.url);

    // Fresh instance: Settings auto-opens because config.instance is empty
    // (see smoke.spec.ts for the baseline assertion of this state).
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const instanceId = dialog.getByTestId('settings-instance-id');
    await expect(instanceId).toBeEditable();
    await instanceId.fill('e2e-instance');

    // A fresh backend config has auth.disabled=true, so the toggle (checked
    // = "Disable Authentication" is ON) should already reflect that. Only
    // flip it if the UI disagrees with that expectation.
    const disableAuthToggle = dialog.getByTestId('settings-disable-auth');
    const disableAuthCheckbox = disableAuthToggle.locator('input[type="checkbox"]');
    await expect(disableAuthCheckbox).toBeChecked();

    const submit = dialog.getByTestId('settings-submit');
    await expect(submit).toBeEnabled();
    await submit.click();

    // Finishing first-run setup closes the wizard and reloads into the app.
    await expect(page.getByTestId('sidebar-add-plan')).toBeVisible();
    await expect(page.getByTestId('sidebar-add-repo')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reload explicitly: setup persisted server-side, so the Settings
    // dialog must not auto-open again.
    await page.reload();
    await expect(page.getByTestId('sidebar-add-plan')).toBeVisible();
    await expect(page.getByTestId('sidebar-add-repo')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('completes first-run setup with a user account and requires login', async ({
    page,
    backrest,
  }) => {
    await page.goto(backrest.url);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const instanceId = dialog.getByTestId('settings-instance-id');
    await expect(instanceId).toBeEditable();
    await instanceId.fill('e2e-instance-auth');

    // Toggle OFF "Disable Authentication" (checked by default) to require a
    // login.
    const disableAuthToggle = dialog.getByTestId('settings-disable-auth');
    const disableAuthCheckbox = disableAuthToggle.locator('input[type="checkbox"]');
    await expect(disableAuthCheckbox).toBeChecked();
    await disableAuthToggle.click();
    await expect(disableAuthCheckbox).not.toBeChecked();

    // Add a user account (no testids on these controls; there are none in
    // the inventory, so fall back to role/placeholder).
    await dialog.getByRole('button', { name: 'Add user' }).click();
    await dialog.getByPlaceholder('Username').last().fill('e2e-user');
    await dialog.getByPlaceholder('Password').last().fill('e2e-password-12345');

    const submit = dialog.getByTestId('settings-submit');
    await expect(submit).toBeEnabled();
    await submit.click();

    // Finishing setup closes the wizard and reloads. With auth now required
    // and no token stored, the Login modal replaces it.
    const loginDialog = page.getByRole('dialog');
    await expect(loginDialog).toBeVisible();
    const loginUsername = loginDialog.getByTestId('login-username');
    const loginPassword = loginDialog.getByTestId('login-password');
    await expect(loginUsername).toBeVisible();
    await expect(loginPassword).toBeVisible();

    await loginUsername.fill('e2e-user');
    await loginPassword.fill('e2e-password-12345');
    await loginDialog.getByTestId('login-submit').click();

    // Login succeeds (reloads the page, then loadConfig succeeds and finds
    // users configured): sidebar shows, no dialogs remain.
    await expect(page.getByTestId('sidebar-add-plan')).toBeVisible();
    await expect(page.getByTestId('sidebar-add-repo')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

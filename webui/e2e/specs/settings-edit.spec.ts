import { test, expect } from '../harness/fixtures';
import { seedInstance } from '../harness/seed';

/**
 * Settings page: opening after first-run setup, immutability of the
 * instance id, and persistence of an edit across a reload.
 *
 * seedInstance(backrest) (default name "e2e-test") sets config.instance and
 * disables auth via the API directly, so on load shouldShowSettings() is
 * false (webui/src/state/configutil.ts) and no dialog auto-opens — the
 * Settings page must be opened explicitly from the sidebar's "Settings"
 * button (webui/src/app/App.tsx, SidebarContent). The separate first-run
 * suite continues to verify that fresh installations use a modal.
 *
 * webui/src/features/settings/SettingsModal.tsx sets
 * `disabled={!!config.instance}` on the instance-id input, so once an
 * instance name exists it is permanently read-only through this modal.
 *
 * The chosen "harmless change" is adding an auth user while leaving
 * auth.disabled = true: toggling auth.disabled off is rejected client-side
 * unless a user already exists (`if (!newConfig.auth?.users &&
 * !newConfig.auth?.disabled) throw ...`), and editing the instance id is not
 * possible (disabled). Adding a user with auth still disabled is accepted and
 * has no side effect on how the rest of the suite reaches the app.
 */
const INSTANCE_NAME = 'e2e-test';

test.describe('settings edit', () => {
  test('settings page shows the immutable instance id, and an edit persists across reload', async ({
    page,
    backrest,
  }) => {
    await seedInstance(backrest, INSTANCE_NAME);
    await page.goto(backrest.url);

    // Seeded instance: sidebar loads directly, no auto-opened dialog.
    await expect(page.getByTestId('sidebar-add-repo')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Open the dedicated Settings page from the sidebar. This is deliberately
    // not a dialog; first-run.spec.ts covers the modal presentation.
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const settingsPage = page.getByTestId('settings-page');
    await expect(settingsPage).toBeVisible();

    const instanceId = settingsPage.getByTestId('settings-instance-id');
    await expect(instanceId).toHaveValue(INSTANCE_NAME);
    await expect(instanceId).toBeDisabled();

    // No edits yet: the save bar is not dirty, so Save is disabled.
    await expect(settingsPage.getByTestId('settings-submit')).toBeDisabled();

    // Harmless change: add an auth user (auth stays disabled throughout).
    await settingsPage.getByRole('button', { name: 'Add user' }).click();
    await settingsPage.getByPlaceholder('Username', { exact: true }).fill('e2e-user');
    await settingsPage.getByPlaceholder('Password', { exact: true }).fill('e2e-password-123');

    const submit = settingsPage.getByTestId('settings-submit');
    await submit.click();

    // SetConfig resolving makes the form clean and disables Save again.
    await expect(submit).toBeDisabled();

    // Reload the settings route and confirm both facts persisted. A configured
    // instance must return to the page rather than opening the first-run modal.
    await page.reload();
    const reopened = page.getByTestId('settings-page');
    await expect(reopened).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const reopenedInstanceId = reopened.getByTestId('settings-instance-id');
    await expect(reopenedInstanceId).toHaveValue(INSTANCE_NAME);
    await expect(reopenedInstanceId).toBeDisabled();

    await expect(reopened.getByPlaceholder('Username', { exact: true })).toHaveValue('e2e-user');
  });
});

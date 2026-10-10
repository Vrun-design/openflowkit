// Headed: home offers the starter diagrams, no API key needed. One
// click draws it, names the document after it and shows the text that drew it.
// The template is the document's first state: nothing to undo (keyboard-only.spec, persona P09).
import { state } from './helpers';
import { expect, test } from './test';

test('home starts a diagram from a template without any AI @gate', async ({ page }) => {
  await page.goto('/#/home');
  const gallery = page.getByRole('list', { name: 'Templates' });
  await expect(gallery.getByRole('button')).not.toHaveCount(0);
  await gallery.getByRole('button', { name: 'User authentication' }).click();
  await page.waitForSelector('[data-testid="v2-canvas"]');
  const welcome = page.getByTestId('v2-welcome');
  await expect.poll(async () => (await state(page)).nodes.length).toBeGreaterThan(4);
  await expect(page.getByRole('textbox', { name: 'Diagram source' })).toHaveValue(/title: User authentication/);
  await expect(welcome).toBeHidden();
  const documentBar = page.getByRole('toolbar', { name: 'Document' });
  await expect(documentBar).toContainText('User authentication');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

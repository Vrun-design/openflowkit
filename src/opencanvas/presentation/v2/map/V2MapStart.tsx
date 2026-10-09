import { IconBrandGithub, IconPlugConnected, IconSitemap } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Button, Field, Icon, Popover, PopoverHeader } from '../../design-system';
import { parseRepoPath, type RepoRef } from '../../../../services/discovery/githubRepo';
import { isRepoMapAddress } from '../../../application/map/repoMapSource';
import { V2Welcome } from '../V2Workspace';

/** The repo a pasted `owner/repo` or GitHub URL names, or null: the same parser and gate the map route applies. */
export function repoToMap(input: string): RepoRef | null {
  const ref = parseRepoPath(input);
  return ref && isRepoMapAddress({ owner: ref.owner, repo: ref.repo, ref: ref.ref }) ? ref : null;
}

interface Props {
  /** The model is being written: the action waits. */
  readonly busy: boolean;
  readonly onStartModel: () => void;
  readonly onMapRepo: (repo: RepoRef) => void;
  readonly onAgent: () => void;
}

/** Map on a document with no model yet: the Canvas welcome's layout, with three ways to get one. The drawing behind is not touched. */
export function V2MapStart({ busy, onStartModel, onMapRepo, onAgent }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); setError(null); };
  return (
    <V2Welcome
      testId="v2-map-start"
      title="See how your system fits together."
      body="Map is built from an architecture model. Your canvas drawing stays as it is."
      actions={(
        <>
          <Button variant="secondary" autoFocus disabled={busy} onClick={onStartModel}><Icon icon={IconSitemap} />Start an architecture model</Button>
          <Button ref={anchor} variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((was) => !was)}><Icon icon={IconBrandGithub} />Map a GitHub repo</Button>
          <Button variant="secondary" onClick={onAgent}><Icon icon={IconPlugConnected} />Connect agent</Button>
          <Popover role="dialog" aria-label="Map a GitHub repo" className="ofk-v2-map-repo" open={open} anchorRef={anchor} onClose={close} placement="bottom-start">
            <PopoverHeader title="Map a GitHub repo" close={<Button variant="quiet" onClick={close}>Close</Button>} />
            <form className="ofk-v2-map-repo-form" noValidate onSubmit={(event) => {
              event.preventDefault();
              const repo = repoToMap(address);
              if (repo) onMapRepo(repo); else setError('Enter owner/repo or a github.com address.');
            }}>
              <Field data-autofocus label="owner/repo or GitHub URL" placeholder="e.g. acme/shop" spellCheck={false} autoComplete="off" value={address}
                {...(error ? { error } : {})}
                onChange={(event) => { setAddress(event.target.value); setError(null); }} />
              <Button variant="secondary" type="submit">Map</Button>
            </form>
          </Popover>
        </>
      )}
    />
  );
}

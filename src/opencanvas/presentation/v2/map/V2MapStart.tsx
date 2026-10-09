import { IconPlugConnected, IconSitemap } from '@tabler/icons-react';
import { useState } from 'react';
import { Button, Field, Icon } from '../../design-system';
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

/** Map on a document with no model yet: the Canvas welcome's layout, two ways to get a model, or a repo to map. The drawing behind is not touched. */
export function V2MapStart({ busy, onStartModel, onMapRepo, onAgent }: Props): React.JSX.Element {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <V2Welcome
      testId="v2-map-start"
      title="See how your system fits together."
      body="Map is built from an architecture model. Your canvas drawing stays as it is."
      actions={(
        <>
          <Button variant="secondary" autoFocus disabled={busy} onClick={onStartModel}><Icon icon={IconSitemap} />Start an architecture model</Button>
          <Button variant="secondary" onClick={onAgent}><Icon icon={IconPlugConnected} />Connect agent</Button>
        </>
      )}
      below={(
        <>
          <p className="ofk-v2-welcome-or" aria-hidden="true">or</p>
          <form className="ofk-v2-map-repo-form" aria-label="Map a GitHub repo" noValidate onSubmit={(event) => {
            event.preventDefault();
            const repo = repoToMap(address);
            if (repo) onMapRepo(repo); else setError('Enter owner/repo or a github.com address.');
          }}>
            <Field label="Map a GitHub repo" placeholder="owner/repo or GitHub URL" spellCheck={false} autoComplete="off" value={address}
              {...(error ? { error } : {})}
              onChange={(event) => { setAddress(event.target.value); setError(null); }} />
            <Button variant="secondary" type="submit">Map repo</Button>
          </form>
        </>
      )}
    />
  );
}

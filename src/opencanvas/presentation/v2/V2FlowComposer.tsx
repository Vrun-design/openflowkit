import { useState } from 'react';
import type { ArchFlow, ArchModel } from '../../../dsl/model/types';
import { slugifyDslId } from '../../../dsl/text';
import { Button } from '../design-system';

/** Compose a message sequence; branch syntax remains available in diagram source. */
export function V2FlowComposer({
  model,
  onSave,
  onCancel,
}: {
  readonly model: ArchModel;
  readonly onSave: (flow: ArchFlow) => void;
  readonly onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [messages, setMessages] = useState([{ from: '', to: '', label: '', tech: '' }]);
  const id = `flow:${slugifyDslId(name)}`;
  const duplicate = model.flows.some((flow) => flow.id === id);
  const valid =
    Boolean(name.trim()) &&
    !duplicate &&
    messages.every(
      (message) => message.from && message.to && message.from !== message.to && message.label.trim()
    );
  const elements = model.elements.filter((element) => !element.env);
  return (
    <form
      className="ofk-v2-model-inspector"
      aria-label="Create flow"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSave({
          id,
          name: name.trim(),
          steps: messages.map((message, index) => ({
            id: `${id}:step:${index + 1}`,
            kind: 'message',
            from: message.from,
            to: message.to,
            label: message.label.trim(),
            ...(message.tech.trim() ? { tech: message.tech.trim() } : {}),
            tags: [],
          })),
        });
      }}
    >
      <label className="ofk-v2-model-field">
        <span>Flow name</span>
        <input required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      {duplicate ? <p role="alert">A flow with this name already exists.</p> : null}
      {messages.map((message, index) => (
        <fieldset key={index} className="ofk-v2-flow-message">
          <legend>Message {index + 1}</legend>
          {(['from', 'to'] as const).map((field) => (
            <label key={field} className="ofk-v2-model-field">
              <span>{field === 'from' ? 'From' : 'To'}</span>
              <select
                required
                value={message[field]}
                onChange={(event) =>
                  setMessages((previous) =>
                    previous.map((item, at) =>
                      at === index ? { ...item, [field]: event.target.value } : item
                    )
                  )
                }
              >
                <option value="">Choose an element</option>
                {elements.map((element) => (
                  <option key={element.id} value={element.id}>
                    {element.name} · {element.id}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="ofk-v2-model-field">
            <span>Message</span>
            <input
              required
              value={message.label}
              onChange={(event) =>
                setMessages((previous) =>
                  previous.map((item, at) =>
                    at === index ? { ...item, label: event.target.value } : item
                  )
                )
              }
            />
          </label>
          <label className="ofk-v2-model-field">
            <span>Protocol</span>
            <input
              value={message.tech}
              placeholder="HTTPS, SQL…"
              onChange={(event) =>
                setMessages((previous) =>
                  previous.map((item, at) =>
                    at === index ? { ...item, tech: event.target.value } : item
                  )
                )
              }
            />
          </label>
          <Button
            variant="quiet"
            disabled={messages.length === 1}
            onClick={() => setMessages((previous) => previous.filter((_, at) => at !== index))}
          >
            Remove message {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        variant="quiet"
        onClick={() =>
          setMessages((previous) => [
            ...previous,
            { from: previous.at(-1)?.to ?? '', to: '', label: '', tech: '' },
          ])
        }
      >
        Add message
      </Button>
      <p className="ofk-v2-model-hint">
        For parallel paths, alternatives and notes, edit the flow in diagram source.
      </p>
      <div className="ofk-v2-model-inspector-actions">
        <Button type="submit" variant="primary" disabled={!valid}>
          Save flow
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

# OpenCanvas Document History

Bounded undo/redo over canonical commands.

- one committed command or batch creates one history entry;
- new commits clear redo history;
- empty undo/redo returns the same state reference;
- past and future stacks obey a configurable positive limit;
- history owns no renderer or persistence behavior.

The legacy Zustand snapshot history remains active until a later flagged store
integration proves parity.

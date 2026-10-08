---
title: Share links and terms
description: How an encrypted share link works, what the server can and cannot see, what is not allowed, and how to report a link.
---

**Copy share link** in the export panel makes a read-only link to the whole document. This
page says how it works and what the rules are.

## How it works

1. Your browser encrypts the document (AES-GCM, a fresh 256-bit key each time).
2. It uploads only the ciphertext. The server returns a random id and a delete token.
3. The link is `<app>/#/s/<id>/<key>`. The key sits in the part after `#`. Browsers never send
   that part to a server.
4. Whoever opens the link downloads the ciphertext and decrypts it in their browser.

What follows from that:

- **The server cannot read your diagram.** It stores ciphertext and has no key. It also
  stores a hash of the delete token, not the token.
- **Anyone with the whole link can read the diagram.** The key is part of it. Share it like a
  password. If the key is cut off, the link does not open.
- **1 MB cap.** The editor refuses a larger document before it uploads, and the server
  rejects it too.
- **You can delete it.** **Delete link** in the export panel removes the newest link made in
  this browser, using the delete token that browser kept. A deleted link stops opening.
  Clearing your browser data loses the token, so keep it in mind before you do.
- **No expiry today.** A link stays until it is deleted.
- Only our own encrypted format is stored. It is not general file hosting.
- Uploads need a human check and are rate limited per network.

## What is not allowed

Do not share links to:

- illegal content;
- malware or anything built to harm a device;
- harassment, threats or content that targets a person.

## Report a link

Send the full link, or just its id (the 32 characters after `#/s/`), to
<!-- owner: confirm this mailbox exists and is monitored before publishing -->
abuse@openflowkit.com.

We cannot read the diagram, so we act on the link you send. We remove the link by its id. After
that it no longer opens for anyone.

## Where to go next

- [Exporting](/exporting/) — files instead of links.
- [Local-first diagramming](/local-first-diagramming/) — what stays on your machine.

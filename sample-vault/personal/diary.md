---
public: true
title: A private note outside projects/
---

This sits outside `projects/`, which is the only folder the process step reads. It says
`public: true` to prove that being outside that folder is decided before frontmatter is ever
looked at.

If the string `OUTSIDE-1050` shows up in the generated bundle, the vault root is being walked
when it should not be.

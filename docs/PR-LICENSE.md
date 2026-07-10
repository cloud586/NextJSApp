# Add proprietary LICENSE (All Rights Reserved)

## Summary

- Adds a root `LICENSE` declaring this repository proprietary with **All Rights Reserved**
- Clarifies that public visibility on GitHub does **not** grant use, copy, modify, or redistribute rights
- Sets `nextjsapp/package.json` `"license": "UNLICENSED"` so npm metadata matches proprietary ownership
- Links the license from the root README for discoverability

## Why

The repo is publicly exposed for collaboration and CI, but the product (Sutoremu / NextJSApp) should remain fully owned by the copyright holder. An explicit proprietary license avoids the default assumption that public source is open-source or freely reusable.

## Test plan

- [ ] Confirm `LICENSE` is present at the repository root
- [ ] Confirm GitHub shows the license as proprietary / other (not MIT/Apache/etc.)
- [ ] Confirm `nextjsapp/package.json` has `"license": "UNLICENSED"`
- [ ] Confirm README “License” section links to `LICENSE`

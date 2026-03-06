This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:8080](http://localhost:8080) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

---

## Pending Investigation

### Verify backend save response shape (certificate form fix)

A fix was applied to prevent the backend's save response from overwriting user-entered form data
(`src/app/contractor/form/[...form]/page.tsx` — `createNewVendor` and `saveCurrentVendor`).

Diagnostic `console.log` statements have been left in place to confirm whether the backend
response actually includes a top-level `form` key and what its field values contain.

**To check:**
1. Log in as a **contractor**
2. Open the contractor registration form
3. Fill in any page and click **Next / Save**
4. Open browser DevTools → **Console** tab
5. Look for lines starting with `[createNewVendor]` or `[saveCurrentVendor]`
6. Paste the output for review

**Files with diagnostic logs:**
- `src/app/contractor/form/[...form]/page.tsx` (lines with `console.log("[createNewVendor]"` and `console.log("[saveCurrentVendor]"`)

Once the response shape is confirmed, remove the `console.log` statements and update the
merge logic if needed.

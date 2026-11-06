# PayPal Mediator Frontend

A frontend-only React prototype for AI-assisted purchase mediation. Includes overview, purchases, purchase details, issue reporting, shared and private conversations, agreement review, case outcomes, and settings. Switch between buyer and seller views in the header.

Uses sample data and in-memory interactions. Messages, issue uploads, and acceptance reset on refresh. AI replies are scripted; payments and account connections are previews only. No backend or external integrations.

```sh
npm install
npm run dev
```

Run `npm run build` for a production build, or `npm run preview` to preview that build.

## Transaction images

The table and purchase details use `ProductThumbnail`. Supply these fields with each transaction when connecting the API:

```js
{
  id: '1042',
  name: 'Studio headphones',
  imageUrl: 'https://cdn.example.com/products/headphones.jpg',
  itemCount: 3,
  // Other existing transaction fields…
}
```

`imageUrl` is an optional image URL; missing or failed images display a neutral package icon. `itemCount` is the total number of products in the order and defaults to one for the current fixtures. Multi-item transactions display the first product image and an additional item count. Map the API response to these fields when replacing `initialOrders` in `src/main.jsx`.

Images are lazy loaded and cropped to a fixed rounded square, keeping table columns stable. They are decorative because the adjacent product name identifies the transaction. The component makes no API calls.

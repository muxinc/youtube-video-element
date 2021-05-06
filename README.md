# `<youtube-video>`
A custom element (web component) for the YouTube player.

The element API matches the HTML5 `<video>` tag, so it can be easily swapped with other media, and be compatible with other UI components that work with the video tag.

## Example

```html
<html>
<head>
  <script type="module" src="https://unpkg.com/youtube-video-element@0"></script>
</head>
<body>

  <youtube-video controls src="https://www.youtube.com/watch?v=rubNgGj3pYo"></youtube-video>

</body>
</html>
```

## Installing

`<youtube-video>` is packaged as a javascript module (es6) only, which is supported by all evergreen browsers and Node v12+.

### Loading into your HTML using `<script>`

Note the `type="module"`, that's important.

> Modules are always loaded asynchronously by the browser, so it's ok to load them in the head :thumbsup:, and best for registering web components quickly.

```html
<head>
  <script type="module" src="https://unpkg.com/youtube-video-element@0"></script>
</head>
```

### Adding to your app via `npm`

```bash
npm install youtube-video-element --save
```
Or yarn
```bash
yarn add youtube-video-element
```

Include in your app javascript (e.g. src/App.js)
```js
import 'youtube-video-element';
```
This will register the custom elements with the browser so they can be used as HTML.

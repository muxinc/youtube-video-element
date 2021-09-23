// Build the HTML/CSS of the element
const template = document.createElement('template');

template.innerHTML = `

<style>
:host {
  display: inline-block;
  box-sizing: border-box;
  position: relative;
  width: 640px;
  height: 360px;
  background-color: #000;
}

iframe,
iframeContainer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  border: none;
  overflow: hidden;
}
</style>

<div id="iframeContainer"></div>
`;

function getIframeTemplate(params) {
  const { id } = params;
  const controls = params.controls ? 1 : 0;
  const template = document.createElement('template');
  const initialTime = params.initialTime ? Math.floor(params.initialTime) : 0;

  template.innerHTML = `
    <iframe
      id="player"
      type="text/html"
      src="https://www.youtube.com/embed/${id}?start=${initialTime}&enablejsapi=1&modestbranding=1&iv_load_policy=3&rel=0&showinfo=0&controls=${controls}&disablekb=${!controls}"
      frameborder="0"
      allowfullscreen
      allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture; xr-spatial-tracking"
    ></iframe>
  `;

  return template;
}

/*
  This video had an issue where it would start to play but then go back to paused.
  Wondering if it's some sort of playlist issue?
  https://www.youtube.com/watch?v=M7lc1UVf-VE
*/

function getIdFromURL(url) {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : url;
}

// Handle multiple players with one YT API load
let ytReady = false;
let ytReadyQueue = [];

function onYTReady(callback) {
  if (ytReady) {
    callback();
  } else {
    ytReadyQueue.push(callback);
  }
}

function handleYoutubeAPILoad() {
  ytReady = true;
  ytReadyQueue.forEach((callback) => {
    console.log('debug calling callback inside ytReadyQueue');
    setTimeout(() => callback());
  });
  ytReadyQueue = [];
}


class YoutubeVideoElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    const src = this.getAttribute('src');
    this.onPlayerReadyQueue = [];

    if (src) {
      this.load();
    }
  }

  load() {
    // Destroy previous videos
    this.ytPlayer = null;
    this.shadowRoot.querySelector('#iframeContainer').innerHTML = '';
    this.readyState = 0;
    this.dispatchEvent(new Event('loadstart'));

    const src = this.getAttribute('src');

    if (!src) {
      // Should throw an code 4 error. We'll get ot that.
      console.error('YoutubeVideoElement: No src was set when load() was called.');
      return;
    }

    const iframeTemplate = getIframeTemplate({
      id: getIdFromURL(src),
      controls: !!this.hasAttribute('controls'),
      initialTime: this.getAttribute('initialtime')
    });

    this.shadowRoot.querySelector('#iframeContainer').appendChild(iframeTemplate.content.cloneNode(true));
    const iframe = this.shadowRoot.querySelector('iframe');

    onYTReady(() => {
      const onPlayerReady = (event) => {
        console.log('debug onPlayerReady', event.target.setVolume, this.ytPlayer.setVolume);
        this.readyState = 1;

        this.onPlayerReadyQueue.forEach((callback) => {
          console.log('debug calling callback inside ytReadyQueue');
          callback();
          // setTimeout(() => callback());
        });
        this.onPlayerReadyQueue = [];
        this.dispatchEvent(new Event('loadedmetadata'));
        this.dispatchEvent(new Event('volumechange'));

        this.timeupdateInterval = setInterval(()=>{
          this.dispatchEvent(new Event('timeupdate'));
        }, 25);
      }

      const onPlayerStateChange = (event) => {
        const state = event.data;

        if (state == 1) {
          this.dispatchEvent(new Event('play'));
        } else if (state == 2) {
          this.dispatchEvent(new Event('pause'));
        }
      }

      const onPlayerError = (event) => {
        console.log('onPlayerError', event.data, event);
      }

      console.log('debug assign this.ytPlayer');
      this.ytPlayer = new YT.Player(iframe, {
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
      console.log('debug assigned this.ytPlayer', this.ytPlayer.setVolume);

      this.ytPlayer.addEventListener('onPlaybackRateChange', e => {
        this.dispatchEvent(new Event('ratechange'));
      });
    });
  }

  connectedCallback() {
  }

  /* onStateChange
    -1 (unstarted)
    0 (ended)
    1 (playing)
    2 (paused)
    3 (buffering)
    5 (video cued).
  */

  get paused() {
    if (!this.ytPlayer) return true;
    return !!([-1,0,2,5].indexOf(this.ytPlayer.getPlayerState()) > -1);
  }

  play() {
    return new Promise((resolve, reject) => {
      if (this.ytPlayer) {
        this.ytPlayer.playVideo();
        resolve();
      } else {
        onYTReady(() => {
          this.ytPlayer.playVideo();
          resolve();
        });
      }
    });
  }

  pause() {
    if (!this.ytPlayer) return;
    this.ytPlayer.pauseVideo();
  }

  get currentTime() {
    if (!this.ytPlayer) return;
    return this.ytPlayer.getCurrentTime();
  }

  set currentTime(timeInSeconds) {
    if (!this.ytPlayer) return;
    // allowSeekAhead is true here,though should technically be false
    // when scrubbing w/ thumbnail previews
    this.ytPlayer.seekTo(timeInSeconds, true);
    this.dispatchEvent(new Event('timeupdate'));
  }

  get muted() {
    if (this.ytPlayer) {
      return this.ytPlayer.isMuted();
    }

    return false;
  }

  set muted(mute) {
    if (!this.ytPlayer) return;
    if (mute) {
      this.ytPlayer.mute()
    } else {
      this.ytPlayer.unMute()
    }

    // Leave time for post message API to update
    setTimeout(() => {
      this.dispatchEvent(new Event('volumechange'));
    }, 100);
  }

  get volume() {
    if (this.ytPlayer) {
      return this.ytPlayer.getVolume() / 100;
    }

    return 1;
  }

  set test (t) {
    console.log('debug test', t);
  }

  set volume(volume) {
    if (!this.ytPlayer) {
      console.log('no this.ytPlayer... will set volume when ready');
      this.onPlayerReadyQueue.push(() => {
        this.volume = volume;
      });
      // onYTReady(() => {
      //   this.volume = volume;
      // });
      return;
    }

    console.log('debug calling this.ytPlayer.setVolume', this.ytPlayer.setVolume, this.ytPlayer, volume);

    this.ytPlayer.setVolume(volume * 100);

    // Leave time for post message API to update
    setTimeout(() => {
      this.dispatchEvent(new Event('volumechange'));
    }, 100);
  }

  get duration() {
    if (!this.ytPlayer) return;
    return this.ytPlayer.getDuration();
  }

  get poster() {
    const id = getIdFromURL(this.src);

    if (id) {
      // https://stackoverflow.com/questions/2068344/how-do-i-get-a-youtube-video-thumbnail-from-the-youtube-api?page=1&tab=votes#tab-top
      return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    } else {
      return null;
    }
  }

  get playbackRate() {
    if (!this.ytPlayer) return;
    return this.ytPlayer.getPlaybackRate();
  }

  set playbackRate(rate) {
    if (!this.ytPlayer) return;
    this.ytPlayer.setPlaybackRate(rate);
  }
}

function loadYoutubeAPI() {
  if (window.onYouTubeIframeAPIReady) {
    console.warn('YoutubeVideoElement: onYouTubeIframeAPIReady already defined. Overwriting.');
  }

  const YouTubeScriptTag = document.createElement('script');
  YouTubeScriptTag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(YouTubeScriptTag, firstScriptTag);

  window.onYouTubeIframeAPIReady = handleYoutubeAPILoad;
}

if (window.customElements.get('youtube-video') || window.YoutubeVideoElement) {
  console.debug('YoutubeVideoElement: <youtube-video> defined more than once.');
} else {
  window.YoutubeVideoElement = YoutubeVideoElement;
  window.customElements.define('youtube-video', YoutubeVideoElement);
  setTimeout(() => {
    loadYoutubeAPI();
  }, 5000);
}

export default YoutubeVideoElement;

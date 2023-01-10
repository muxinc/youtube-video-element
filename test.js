import { fixture, assert, aTimeout } from '@open-wc/testing';
import './index.js';

describe('<youtube-video>', () => {
  it('has a video like API', async function () {
    this.timeout(10000);

    const player = await fixture(`<youtube-video
      src="https://www.youtube.com/watch?v=H3KSKS3TTbc"
      muted
    ></youtube-video>`);

    assert.equal(player.paused, true, 'is paused on initialization');

    await player.loadComplete;

    assert.equal(player.paused, true, 'is paused on initialization');
    assert(!player.ended, 'is not ended');

    assert.equal(player.volume, 1, 'is all turned up');
    player.volume = 0.5;
    await aTimeout(100); // postMessage is not instant
    assert.equal(player.volume, 0.5, 'is half volume');

    assert(!player.loop, 'loop is false by default');
    player.loop = true;
    assert(player.loop, 'loop is true');

    // player.muted = true;
    // await aTimeout(50); // postMessage is not instant
    assert(player.muted, 'is muted');

    if (player.duration == null || Number.isNaN(player.duration)) {
      await promisify(player.addEventListener.bind(player))('durationchange');
    }

    assert.equal(Math.round(player.duration), 254, `is 254s long`);

    const loadComplete = player.loadComplete;

    player.src = 'https://www.youtube.com/watch?v=C7dPqrmDWxs';
    await player.loadComplete;

    assert(
      loadComplete != player.loadComplete,
      'creates a new promise after new src'
    );

    if (player.duration == null || Number.isNaN(player.duration)) {
      await promisify(player.addEventListener.bind(player))('durationchange');
    }

    assert.equal(Math.round(player.duration), 235, `is 235s long`);

    player.src = 'https://www.youtube.com/watch?v=H3KSKS3TTbc';
    await player.loadComplete;

    if (player.duration == null || Number.isNaN(player.duration)) {
      await promisify(player.addEventListener.bind(player))('durationchange');
    }

    assert.equal(Math.round(player.duration), 254, `is 254s long`);

    try {
      await player.play();
    } catch (error) {
      console.warn(error);
    }
    assert(!player.paused, 'is playing after player.play()');

    await aTimeout(1000);

    assert.equal(String(Math.round(player.currentTime)), 1, 'is about 1s in');

    player.playbackRate = 2;
    await aTimeout(1000);

    assert.equal(String(Math.round(player.currentTime)), 3, 'is about 3s in');
  });
});

export function promisify(fn) {
  return (...args) =>
    new Promise((resolve) => {
      fn(...args, (...res) => {
        if (res.length > 1) resolve(res);
        else resolve(res[0]);
      });
    });
}

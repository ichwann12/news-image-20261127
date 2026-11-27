# news-image-20261127 — The World Today: Friday 27 November 2026

[![make.fun · news-image-20261127](https://make.fun/badge/news-image-20261127.svg)](https://make.fun/bounty/news-image-20261127?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261127)
[![make.fun · news-image-20261127 rank](https://make.fun/badge/news-image-20261127/ichwann12/news-image-20261127/rank.svg)](https://make.fun/bounty/news-image-20261127/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261127)
[![make.fun · news-image-20261127 reward](https://make.fun/badge/news-image-20261127/ichwann12/news-image-20261127/reward.svg)](https://make.fun/bounty/news-image-20261127?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261127)

A newspaper front page that sums up the world's news of **Friday 27 November 2026** in one image: the biggest Russia–Ukraine prisoner swap of the war due "shortly", Serbia's snap presidential vote, Black Friday's market rally, Hong Kong's tower-fire anniversary, a deadly Gaza drone strike, Kim Jong Un's nuclear vow, and Rocket Lab's "Night Owls Never Sleep" launch.

## How it works

`main.ts` (Node 22, standard library only) draws a 1024×1024 PNG in memory with a hand-rolled PNG encoder and a 5×7 bitmap font — no packages, no network, no input files — and writes it to `/output/entry.png`. Fully deterministic: fixed palette, fixed layout, no clock, no randomness, so both runs write byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

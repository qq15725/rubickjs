import { Animation, DnD, Effect, Engine, Graphics2D, Image2D, Node2D, Text2D } from 'rubickjs'

const engine = new Engine()

engine.use(new DnD())

engine.on('pointerdown', e => {
  console.log(e.target)
})

// view
const view = engine.observe().view!
view.style.width = '100vw'
view.style.height = '100vh'
document.body.append(view)

// text
const text = new Text2D({
  content: [
    {
      fragments: [
        { content: 'He', color: 'red', fontSize: 12 },
        { content: 'llo', color: 'black' },
      ],
    },
    { content: ', ', color: 'grey' },
    { content: 'World!', color: 'black' },
  ],
  style: {
    left: 100,
    top: 100,
    width: 100,
    height: 200,
    fontSize: 22,
    backgroundColor: '#0000FF',
    textDecoration: 'underline',
  },
})

engine.root.addChild(text)
engine.root.addChild(new Text2D({ content: 'Text12312211221' }))

// sprite
const bunny = new Image2D({
  src: 'https://pixijs.com/assets/bunny.png',
  draggable: true,
  style: {
    backgroundColor: '#0000FF',
    borderRadius: 30,
  },
})
engine.root.addChild(bunny)

// group
const group = new Node2D({
  style: {
    left: 200,
    top: 100,
  },
})
for (let i = 0; i < 5; i++) {
  const item = new Image2D({
    src: 'https://pixijs.com/assets/bunny.png',
  })
  item.style.left = i * 10
  group.addChild(item)
}

// effect
const effect = new Effect({
  glsl: `vec4 transition(vec2 uv) {
  return mix(
    getColor(uv),
    getToColor(uv),
    progress
  );
}`,
})

group.addChild(
  new Animation({
    duration: 3000,
    keyframes: [
      { left: 300, top: 100, offset: 0, easing: 'easeIn' },
      { left: 400, top: 120, offset: 0.5, easing: 'easeOut' },
      { left: 350, top: 120, offset: 0.8, easing: 'easeOut' },
      { left: 300, top: 100, offset: 1 },
    ],
    // loop: true,
  }),
)

engine.root.addChild(group)

engine.timeline.on('update', (_, delta) => {
  bunny.style.rotate += 0.01 * delta
  group.style.rotate += 0.01 * delta
})

engine.root.addChild(
  new Graphics2D({
    style: {
      left: 200,
      top: 200,
      backgroundColor: '#000000',
    },
  })
    .drawRect(0, 0, 300, 300),
)

engine.start()

;(window as any).engine = engine
;(window as any).group = group
;(window as any).bunny = bunny

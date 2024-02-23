import { Animation, DnD, Effect, Engine, Graphics, Image, Node2D, Text, Texture, Video } from 'rubickjs'

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
engine.root.addChild(new Text({ content: 'Text12312211221' }))
engine.root.addChild(new Text({
  draggable: true,
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
}))

// sprite
const bunny = new Image({
  src: '/playground/assets/example.jpg',
  draggable: true,
  // mask: new Graphics().drawCircle(50, 50, 50),
  style: {
    left: 700,
    top: 100,
    width: 200,
    height: 200,
    backgroundColor: '#0000FF',
    borderRadius: 30,
  },
})
engine.root.addChild(bunny)

engine.root.addChild(new Video({
  draggable: true,
  src: 'https://pixijs.com/assets/video.mp4',
}))

// group
const group = new Node2D({
  style: {
    left: 200,
    top: 100,
  },
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
for (let i = 0; i < 5; i++) {
  const item = new Image({
    src: '/playground/assets/example.jpg',
    style: {
      width: 30,
      height: 30,
    },
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

const line = new Graphics()
engine.root.addChild(line)
line.context.lineWidth = 10
line.context.texture = Texture.RED

let press = false
engine.on('pointerdown', e => {
  press = true
  line.context.beginPath()
  line.context.moveTo(e.x, e.y)
})

engine.on('pointermove', e => {
  if (!press) return
  line.context.lineTo(e.x, e.y)
  line.context.stroke()
  line.requestRedraw()
})

engine.on('pointerup', () => {
  press = false
})

engine.timeline.on('update', (_, delta) => {
  bunny.style.rotate += 0.01 * delta
  group.style.rotate += 0.01 * delta
})

engine.start()

;(window as any).engine = engine

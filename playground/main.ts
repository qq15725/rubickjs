import { Animation, Effect, Engine, Image, Node2D, Text } from 'rubickjs'

const engine = new Engine()

// view
const view = engine.observeView().view!
view.style.width = '100vw'
view.style.height = '100vh'
document.body.append(view)

// text
const text = new Text('Hello, World!', {
  left: 100,
  top: 100,
  width: 100,
  height: 200,
  fontSize: 22,
  textWrap: 'wrap',
  color: 'red',
  backgroundColor: '#0000FF',
  textDecoration: 'underline',
})
engine.root.addChild(text)

// sprite
const bunny = new Image('https://pixijs.com/assets/bunny.png', {
  backgroundColor: '#0000FF',
})
engine.root.addChild(bunny)

// group
const group = new Node2D({
  left: 200,
  top: 100,
})
for (let i = 0; i < 5; i++) {
  const item = new Image('https://pixijs.com/assets/bunny.png', {
    backgroundColor: '#00FF0011',
  })
  item.x = i * 10
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
  bunny.x = engine.width / 2 - bunny.width / 2
  bunny.y = engine.height / 2 - bunny.height / 2
  bunny.rotation += 0.001 * delta
  group.rotation += 0.001 * delta
})

engine.start()

;(window as any).engine = engine
;(window as any).group = group
;(window as any).bunny = bunny

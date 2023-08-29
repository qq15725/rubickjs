import { Assets, Canvas, Label, Node2D, Sprite, lerp } from 'rubickjs'

const canvas = new Canvas()

canvas.observe()
const view = canvas.view!
view.style.width = '100vw'
view.style.height = '100vh'
document.body.append(view)

// text
const text = new Label('Hello, World!', {
  fontSize: 22,
  color: 'red',
  textDecoration: 'underline',
})
text.x = 100
text.y = 100
canvas.appendChild(text)

const texture = Assets.load('https://pixijs.com/assets/bunny.png')

// sprite
const bunny = new Sprite(texture)
canvas.appendChild(bunny)

// group
const group = new Node2D()
group.x = 400
group.y = 100
for (let i = 0; i < 5; i++) {
  const item = new Sprite(texture)
  item.x = i * 10
  group.appendChild(item)
}
canvas.appendChild(group)

const animation = {
  keyframes: [{ opacity: 0, offset: 0 }, { offset: 1 }],
  duration: 2000,
}

canvas.timeline.on('update', delta => {
  text.rotation += 0.005 * delta
  bunny.x = canvas.width / 2 - bunny.width / 2
  bunny.y = canvas.height / 2 - bunny.height / 2
  bunny.rotation += 0.001 * delta
  group.rotation += 0.001 * delta

  const start = animation.keyframes[0]
  const end = animation.keyframes[1]
  const time = (canvas.timeline.currentTime - animation.duration) / animation.duration
  bunny.alpha = lerp(1, 0, time)
})

canvas.start()

;(window as any).canvas = canvas
;(window as any).bunny = bunny

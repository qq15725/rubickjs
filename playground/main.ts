import { Canvas, Text } from 'rubickjs'

const cnavsa = new Canvas({
  view: document.querySelector('canvas'),
})

cnavsa.addChild(
  new Text('Hello, World!', {
    fontSize: 22,
    color: 'red',
    textDecoration: 'underline',
  }),
)

cnavsa.start()

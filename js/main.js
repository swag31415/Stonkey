const line = document.getElementById("line")
const [width, height] = [300, 100]
const pad = 10

const { createApp } = Vue
const app = createApp({
  data() {
    return {
      state: 'starting',
      symbol: '',
      hint: 50,
      score: 0,
      round: 0,
      n_rounds: 0,
      step: 10,
      down_h: 50,
      up_h: 50,
      chf: () => true,
      line_pts: ""
    }
  },
  methods: {
    shuffle_arr(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    },
    async get_data(symbol) {
      resp = await fetch(`https://misc-server-07ti.onrender.com/stonkey?sym=${symbol}`)
      if (!resp.ok) throw resp.statusText
      data = await resp.text()
      if (data.length < 300) throw data // If it's really short something's up
      return data
      .split('\n')
      .slice(1,-1)
      .reverse()
      .reduce((dict, row) => {
        [date, val, ...rest] = row.split(',')
        date = date.substring(0, 10)
        val = parseFloat(val)
        if (date in dict) dict[date].push(val)
        else dict[date] = [val];
        return dict
      }, {})
    },
    draw(arr, tlen) {
      [min, max] = [Math.min(...arr), Math.max(...arr)]
      x_scale = width / tlen
      y_scale = (height - 2*pad) / (max - min)
      this.line_pts = arr.reduce((s, v, i) => s + `${(i * x_scale) || 0} ${(height - pad - (v - min) * y_scale) || 0} `, "")
      // Return the last y value
      return pad + (arr[arr.length - 1] - min) * y_scale
    },
    async is_choose_up(y_val) {
      this.down_h = 100 * (y_val / height)
      this.up_h = 100 - this.down_h
      this.state = 'choosing'
      let icu = await new Promise(res => this.chf = res)
      this.state = 'playing'
      return icu
    },
    async play(arr) {
      this.line_pts = ""
      hinted = false
      for (let i = 1; i <= arr.length; i++) {
        // Draw and get last y value
        last_y = this.draw(arr.slice(0, i), arr.length)
        // Check for hint stage
        if (!hinted && (i / arr.length) > (this.hint / 100)) {
          pval = arr[i]
          was_up = await this.is_choose_up(last_y)
          hinted = true
        }
        // Animation
        await new Promise(r => setTimeout(r, this.step))
      }
      return was_up == (arr[arr.length-1] > pval)
    },
    async start() {
      this.state = 'loading'
      let dict = {}
      try {
        dict = await this.get_data(this.symbol)
      } catch (err) {
        console.error(err)
        alert("there was an error")
        return;
      }
      let queue = Object.values(dict)
      this.shuffle_arr(queue)
      this.state = 'playing'
      this.n_rounds = queue.length
      for (let i = 0; i < this.n_rounds; i++) {
        this.round = i
        this.score += await this.play(queue[i])
      }
      this.state = 'done'
      setInterval(createMoney, 100)
    },
    reset() {
      this.state = 'starting'
      this.score = 0
    }
  }
}).mount('#app')

function createMoney() {
  const money = document.createElement('img')
  money.src = 'stonks.png'
  money.width = 80
  money.classList.add('money')
  money.style.left = Math.random() * window.innerWidth + 'px'
  document.body.prepend(money);
  setTimeout(() => {
    document.body.removeChild(money)
  }, 2000)
}
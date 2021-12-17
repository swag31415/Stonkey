async function get_data(symbol) {
  resp = await fetch(`https://miscserver.herokuapp.com/stonkey?sym=${symbol}`)
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
}

const line = document.getElementById("line")
const [width, height] = [300, 100]
const pad = 10

async function is_choose_up(y_val) {
  prop = 100 * (y_val / height)
  $("#up").css("height", 100 - prop + '%').show()
  $("#down").css("height", prop + '%').show()
  icu = await new Promise(res => {
    $("#up").on("click.icu", () => res(true))
    $("#down").on("click.icu", () => res(false))
  })
  $("#up,#down").off("click.icu").hide()
  return icu
}

function draw(arr, tlen) {
  [min, max] = [Math.min(...arr), Math.max(...arr)]
  x_scale = width / tlen
  y_scale = (height - 2*pad) / (max - min)
  points = arr.reduce((s, v, i) => s + `${(i * x_scale) || 0} ${(height - pad - (v - min) * y_scale) || 0} `, "")
  line.setAttribute("points", points)
  // Return the last y value
  return pad + (arr[arr.length - 1] - min) * y_scale
}

async function play(arr, hint, step) {
  // Clear
  points = ""
  line.setAttribute("points", points)
  // Render and play
  hinted = false
  for (let i = 1; i <= arr.length; i++) {
    // Draw and get last y value
    last_y = draw(arr.slice(0, i), arr.length)
    // Check for hint stage
    if (!hinted && (i / arr.length) > (hint / 100)) {
      pval = arr[i]
      was_up = await is_choose_up(last_y)
      hinted = true
    }
    // Animation
    await new Promise(r => setTimeout(r, step))
  }
  return was_up == (arr[arr.length-1] > pval)
}

function update_points(score, round, n_rounds) {
  $("#score").text(`Current Score: ${score}/${round}`)
  $("#progress").css("width", 100 * (round/n_rounds) + '%')
}

$("#play").click(async () => {
  // Display loader
  $("#dloader").show()
  $("#inputs").hide()
  // Get the data
  try {
    dict = await get_data($("#sym").val())
  } catch (err) {
    console.error(err)
    alert("there was an error")
    return;
  }
  // Get values
  queue = Object.values(dict)
  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    j = Math.ceil(i*Math.random());
    [queue[i], queue[j]] = [queue[j], queue[i]]
  }
  // Confgure values
  const hint = $("#hint").val()
  $("#up,#down").css("width", 100 - hint + '%')
  // Show game
  $("#game").show()
  $("#dloader").hide()
  // Play
  score = 0
  update_points(0, 0, queue.length)
  for (let i = 0; i < queue.length; i++) {
    score += await play(queue[i], hint, 50)
    update_points(score, i+1, queue.length)
  }
  console.log(`final score is ${score}`)
})
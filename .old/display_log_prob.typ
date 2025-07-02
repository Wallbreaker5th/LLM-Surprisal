#set text(lang: "zh", region: "cn", font: ((name: "DejaVu Sans Mono", covers: "latin-in-cjk"), "Source Han Sans SC"), size: 1em)
#set page(height: auto, margin: 2cm)

#let display_log_prob(tokens, token_log_probs, token_top5) = {
    let entropies = token_log_probs.map(x => -x / calc.ln(2))
    for (x, y, top5) in tokens.zip(entropies, token_top5) {
        let token = x
        let entropy = y
        let opacity = calc.clamp(entropy / 20, 0, 1) * 100%
        let color = blue.transparentize(100% - opacity)
        // let color = gradient.linear(..color.map.turbo).sample(opacity).transparentize(50%)
        let inline-token = token.replace("\n", "↵")
        if inline-token.codepoints().all(x => x == "\n") {
            while token.starts-with("\n") {
                token = token.slice(1)
                "\n"
            }
        }
        box(grid(
            grid.cell(
                highlight(inline-token, fill: color, extent: -0.5pt, radius: 2pt),
                inset: (y: 2pt)
            ),
            text(str(calc.round(entropy, digits: 2)), size: 0.5em),
            ..top5.map(x => {
                let s = x.at("token_str").replace("\n", "↵")
                let p = calc.exp(x.at("log_prob")) * 100%
                grid.cell({
                    place(bottom, box(width: p, height: 50%, fill: green.lighten(20%)))
                    text(s, size: 0.5em)
                }, fill: green.lighten(90%))
            }),
            rows: (auto, ) + (0.5em + 1pt, ) * top5.len(),
            align: bottom,
        ), inset: 1pt)
        while token.ends-with("\n") {
            token = token.slice(0, -1)
            "\n"
        }
    }
}

#let compare_log_prob(tokens, token_log_probs, tokens_in_context, token_log_probs_in_context, token_top5_in_context) = {
    token_top5_in_context = token_top5_in_context.slice(token_top5_in_context.len() - tokens.len(), token_top5_in_context.len())
    token_log_probs_in_context = token_log_probs_in_context.slice(token_log_probs_in_context.len() - tokens.len(), token_log_probs_in_context.len())
    tokens_in_context = tokens_in_context.slice(tokens_in_context.len() - tokens.len(), tokens_in_context.len())
    token_log_probs_in_context.at(0) = token_log_probs.at(0)
    let entropies = token_log_probs.map(x => -x / calc.ln(2))
    let entropies_in_context = token_log_probs_in_context.map(x => -x / calc.ln(2))
    for (x, y, y_, top5) in tokens.zip(entropies, entropies_in_context, token_top5_in_context) {
        let token = x
        let opacity = calc.clamp((y_ - y) / 5, -1, 1) * 100%
        let color = if opacity > 0% {
            blue.transparentize(100% - opacity)
        } else {
            red.transparentize(100% + opacity)
        }
        let inline-token = token.replace("\n", "↵")
        if inline-token.codepoints().all(x => x == "\n") {
            while token.starts-with("\n") {
                token = token.slice(1)
                "\n"
            }
        }
        
        box(grid(
            grid.cell(
                highlight(inline-token, fill: color, extent: -0.5pt, radius: 2pt),
                inset: (y: 2pt)
            ),
            ..top5.map(x => {
                let s = x.at("token_str").replace("\n", "↵")
                let p = calc.exp(x.at("log_prob")) * 100%
                grid.cell({
                    place(bottom, box(width: p, height: 50%, fill: green.lighten(20%)))
                    text(s, size: 0.5em)
                }, fill: green.lighten(90%))
            }),
            rows: (auto, ) + (0.5em + 1pt, ) * (top5.len() + 1),
            align: bottom,
        ), inset: 1pt)
        while token.ends-with("\n") {
            token = token.slice(0, -1)
            "\n"
        }
    }
}

#json("token_logprob_output.json").map(x => {
    // if x.label == 1 {
    //     block(inset: 3pt, fill: red.lighten(80%))[AI]
    // } else {
    //     block(inset: 3pt, fill: green.lighten(80%))[Human]
    // }

    (display_log_prob(x.at("tokens"), x.at("token_log_probs"), x.at("token_top5")) + line(length: 100%))
}).sum()

// #let f = json("token_logprob_output.json").at(0)
// #let g = json("token_logprob_output.json").at(1)

// #display_log_prob(g.at("tokens"), g.at("token_log_probs"), g.at("token_top5"))

// #line(length: 100%)

// #compare_log_prob(g.at("tokens"), g.at("token_log_probs"), f.at("tokens"), f.at("token_log_probs"), f.at("token_top5"))

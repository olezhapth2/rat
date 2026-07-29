# Character Sprites

## File naming convention

```
{charId}_{hatId}_{direction}_{state}.png
```

- **charId**: `petr`, `anya`, `sergey`, `kate`, `dima`, `olga`, `misha`, `lena`, `artem`, `nina`, `vova`
- **hatId**: `none`, `hat0`, `hat1`, `hat2`, `hat3`, `hat4`
- **direction**: `front`, `back`, `left`, `right`
- **state**: `idle`, `run`

## Examples

```
petr_none_front_idle.png    — Петя без шляпы, стоит, лицом к камере
petr_hat0_front_run.png     — Петя в шляпе 0, бежит, лицом к камере
anya_hat3_back_idle.png     — Аня в шляпе 3, стоит, спиной к камере
```

## Dimensions

- **idle**: 40×60 px (1 tile × 1.5 tiles)
- **run**: 40×60 px (same size, different pose)

## Required images per character

| Variant | Count |
|---|---|
| none (no hat) × 4 dirs × 2 states | 8 |
| hat0..hat4 × 4 dirs × 2 states | 40 |
| **Total per character** | **48** |
| **Total (11 characters)** | **528** |

## Fallback

If an image is missing, the game falls back to a colored rounded rectangle.

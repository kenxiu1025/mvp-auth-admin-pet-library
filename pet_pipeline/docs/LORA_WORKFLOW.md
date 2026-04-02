# LoRA Workflow

The LoRA layer is designed for scale. It does not need to be trained on day one, but the dataset shape and operating rules should be stable now.

## Dataset structure

- `assets/training/white_cat/raw/`
- `assets/training/white_cat/processed/`
- `assets/training/white_cat/captions/`
- `assets/training/tabby_cat/raw/`
- `assets/training/tabby_cat/processed/`
- `assets/training/tabby_cat/captions/`

## Good training images

- same character identity every time
- correct eye color
- stable ears and tail
- stable stripe placement for `tabby_cat`
- centered framing with enough body visibility
- clean background or already-isolated character

## Bad training images

- severe anatomy drift
- wrong breed features
- extra accessories
- heavily stylized poses that hide core identity
- dramatic perspective distortion
- bad crops or missing paws/ears/tail

## Caption rule

Captions should emphasize the identity, not overfit the state.

Good:

- `whitecatpet, white fold-ear kitten, sapphire blue eyes, pink nose, round face, sitting pose`
- `tabbycatpet, silver gray american shorthair tabby kitten, emerald green eyes, pink nose, stable forehead stripes, sitting pose`

Avoid:

- huge emotional narratives
- too many one-off accessories
- strong camera/lighting terms that are not part of the character identity

## LoRA training prep

1. Put raw images into `raw/`.
2. Run `prepare_lora_dataset.py`.
3. Run `generate_captions.py`.
4. Manually review captions.
5. Use `train_lora_stub.py` to generate the training command template.

## LoRA inference strategy

Once a character LoRA is trained:

1. use LoRA in a body render or preview render
2. keep prompt concise and identity-focused
3. use face inpaint for expression changes
4. do not try to force all emotion through the LoRA alone


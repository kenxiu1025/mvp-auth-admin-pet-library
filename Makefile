PYTHON ?= python3

.PHONY: pet-preview-jobs pet-production-jobs pet-render-preview pet-render-production pet-inpaint pet-review pet-manifest pet-lora-audit pet-lora-captions pet-lora-stub

pet-preview-jobs:
	$(PYTHON) pet_pipeline/scripts/enqueue_jobs.py --profile preview --character white_cat --character tabby_cat --states default calm happy hungry angry sleepy

pet-production-jobs:
	$(PYTHON) pet_pipeline/scripts/enqueue_jobs.py --profile production --character white_cat --character tabby_cat --states default calm happy hungry angry sleepy

pet-render-preview:
	$(PYTHON) pet_pipeline/scripts/run_render.py --profile preview --limit 2

pet-render-production:
	$(PYTHON) pet_pipeline/scripts/run_render.py --profile production --limit 1

pet-inpaint:
	$(PYTHON) pet_pipeline/scripts/run_inpaint.py --character white_cat --state happy

pet-review:
	$(PYTHON) pet_pipeline/scripts/review_outputs.py

pet-manifest:
	$(PYTHON) pet_pipeline/scripts/export_manifest.py

pet-lora-audit:
	$(PYTHON) pet_pipeline/scripts/prepare_lora_dataset.py

pet-lora-captions:
	$(PYTHON) pet_pipeline/scripts/generate_captions.py

pet-lora-stub:
	$(PYTHON) pet_pipeline/scripts/train_lora_stub.py


FROM public.ecr.aws/lambda/python:3.12

# Lambda runtime user cannot write to $HOME; bundle HF cache in a readable path
ENV HF_HOME=/opt/hf \
    TRANSFORMERS_CACHE=/opt/hf \
    HF_HUB_CACHE=/opt/hf
RUN mkdir -p /opt/hf

# Install system deps for PyMuPDF and psycopg
RUN dnf install -y gcc libpq-devel && dnf clean all

# Install CPU-only PyTorch first (saves ~1.5GB vs full torch)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY mindmesh-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download ML models so cold starts don't fetch from HuggingFace
RUN python -c "\
from transformers import BertTokenizer; \
BertTokenizer.from_pretrained('allenai/specter_plus_plus')"
RUN python -c "\
from adapters import AutoAdapterModel; \
m = AutoAdapterModel.from_pretrained('allenai/specter_plus_plus', trust_remote_code=True); \
m.load_adapter('allenai/specter2', source='hf')"

COPY mindmesh-backend/ ${LAMBDA_TASK_ROOT}/backend/

CMD ["backend.main.handler"]

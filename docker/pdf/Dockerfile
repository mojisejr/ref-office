# LibreOffice for docx -> pdf. Fonts: Liberation (metric-compatible with Times New Roman)
# and Sarabun (OFL, stands in for TH Sarabun New, which is not redistributable here).
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-writer-nogui fonts-liberation fonts-thai-tlwg fontconfig \
 && rm -rf /var/lib/apt/lists/*
ADD https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf /usr/share/fonts/truetype/sarabun/
ADD https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf /usr/share/fonts/truetype/sarabun/
ADD https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Italic.ttf /usr/share/fonts/truetype/sarabun/
ADD https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-BoldItalic.ttf /usr/share/fonts/truetype/sarabun/
COPY fonts.conf /etc/fonts/local.conf
RUN chmod 644 /usr/share/fonts/truetype/sarabun/*.ttf && fc-cache -f
WORKDIR /work
ENTRYPOINT ["soffice", "--headless", "--norestore"]

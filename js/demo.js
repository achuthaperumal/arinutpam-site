(function () {
  const uploadArea = document.getElementById('demoUpload');
  const fileInput = document.getElementById('demoFileInput');
  const preview = document.getElementById('demoPreview');
  const demoImage = document.getElementById('demoImage');
  const resetBtn = document.getElementById('demoReset');
  const loading = document.getElementById('demoLoading');
  const status = document.getElementById('demoStatus');
  const chartContainer = document.getElementById('demoChartContainer');
  const samples = document.querySelectorAll('.demo__sample');

  let model = null;
  let chart = null;
  let modelLoading = false;

  // ===== Lazy Load TensorFlow.js + MobileNet =====
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadModel() {
    if (model) return model;
    if (modelLoading) return;
    modelLoading = true;

    status.style.display = 'none';
    loading.style.display = 'block';

    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');

      model = await mobilenet.load({ version: 2, alpha: 0.5 });
      loading.style.display = 'none';
      status.style.display = 'block';
      status.querySelector('p').textContent = 'Model ready! Upload or select an image to classify.';
    } catch (err) {
      loading.style.display = 'none';
      status.style.display = 'block';
      status.querySelector('p').textContent = 'Failed to load AI model. Please check your connection and try again.';
      modelLoading = false;
    }

    return model;
  }

  // ===== Image Classification =====
  async function classifyImage(imgElement) {
    if (!model) await loadModel();
    if (!model) return;

    status.style.display = 'none';
    loading.style.display = 'block';
    loading.querySelector('p').textContent = 'Classifying...';

    try {
      const predictions = await model.classify(imgElement, 5);
      loading.style.display = 'none';
      displayResults(predictions);
    } catch (err) {
      loading.style.display = 'none';
      status.style.display = 'block';
      status.querySelector('p').textContent = 'Classification failed. Please try another image.';
    }
  }

  // ===== Display Results Chart =====
  function displayResults(predictions) {
    chartContainer.style.display = 'block';
    status.style.display = 'none';

    const labels = predictions.map((p) => {
      const name = p.className.split(',')[0].trim();
      return name.length > 25 ? name.substring(0, 22) + '...' : name;
    });
    const data = predictions.map((p) => Math.round(p.probability * 100));

    if (chart) chart.destroy();

    const ctx = document.getElementById('demoChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Confidence %',
            data,
            backgroundColor: [
              'rgba(6, 182, 212, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(244, 114, 182, 0.8)',
            ],
            borderColor: [
              'rgba(6, 182, 212, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(251, 191, 36, 1)',
              'rgba(244, 114, 182, 1)',
            ],
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: '#1e293b',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(30, 41, 59, 0.5)' },
            ticks: { color: '#94a3b8', callback: (v) => v + '%' },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#f1f5f9', font: { size: 12 } },
          },
        },
      },
    });
  }

  // ===== Upload Handling =====
  uploadArea.addEventListener('click', () => {
    if (!preview.style.display || preview.style.display === 'none') {
      fileInput.click();
    }
  });

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      showPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function showPreview(src) {
    // Hide upload UI, show preview
    uploadArea.querySelector('.demo__upload-icon').style.display = 'none';
    uploadArea.querySelector('.demo__upload-text').style.display = 'none';
    uploadArea.querySelector('.demo__upload-hint').style.display = 'none';
    preview.style.display = 'block';
    demoImage.src = src;

    demoImage.onload = () => classifyImage(demoImage);
  }

  // ===== Reset =====
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    preview.style.display = 'none';
    uploadArea.querySelector('.demo__upload-icon').style.display = '';
    uploadArea.querySelector('.demo__upload-text').style.display = '';
    uploadArea.querySelector('.demo__upload-hint').style.display = '';
    chartContainer.style.display = 'none';
    status.style.display = 'block';
    status.querySelector('p').textContent = model
      ? 'Model ready! Upload or select an image to classify.'
      : 'Upload an image to see AI classification results.';
    fileInput.value = '';
  });

  // ===== Sample Images =====
  const sampleImages = {
    cat: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg',
    car: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2019_Honda_Civic_sedan_%28facelift%29%2C_front_9.29.19.jpg/1200px-2019_Honda_Civic_sedan_%28facelift%29%2C_front_9.29.19.jpg',
    flower: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Sunflower_from_Silesia2.jpg/800px-Sunflower_from_Silesia2.jpg',
  };

  samples.forEach((sample) => {
    sample.addEventListener('click', async () => {
      const key = sample.dataset.sample;
      const url = sampleImages[key];
      if (!url) return;

      if (!model) await loadModel();

      showPreview(url);
    });
  });

  // ===== Lazy Load Model on Section Visibility =====
  const demoSection = document.getElementById('demo');
  const demoObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadModel();
        demoObserver.disconnect();
      }
    },
    { threshold: 0.1 }
  );
  demoObserver.observe(demoSection);
})();

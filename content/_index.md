+++
title = "首頁"
+++

專業的財稅服務，助您輕鬆應對未來。

<div class="carousel-container">
  <div class="carousel-slide">
    <img src="/images/banner1.jpg" alt="服務項目 1">
    <img src="/images/banner2.jpg" alt="服務項目 2">
    <img src="/images/banner3.jpg" alt="成功案例">
  </div>
</div>

<style>
.carousel-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  margin-top: 20px;
}

.carousel-slide {
  display: flex;
  width: 300%;
  animation: scrollCarousel 12s linear infinite;
}

.carousel-slide img {
  width: 100%;
  height: auto;
  flex: 1 0 100%;
  object-fit: cover;
}

@keyframes scrollCarousel {
  0% { transform: translateX(0); }
  33% { transform: translateX(-100%); }
  66% { transform: translateX(-200%); }
  100% { transform: translateX(0); }
}
</style>

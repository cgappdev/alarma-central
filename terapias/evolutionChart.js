export default function renderEvolutionChart(canvas, progressPatientSelectValue, sessions, pSessions = null) {
    if (!pSessions) {
      const patientId = progressPatientSelectValue;
      pSessions = sessions.filter(s => s.patientId === patientId && s.isCompleted);
      pSessions.sort((a, b) => a.date.localeCompare(b.date));
    }

    const ctx = canvas.getContext('2d');
    
    // Responsive Canvas Resizing
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth;
    const height = 300;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    if (pSessions.length === 0) return;

    // Draw Background Grid
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Y Axis Grid lines (0 to 10 scale)
    for (let i = 0; i <= 5; i++) {
      const y = paddingTop + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Axis label (left side: Pain 10 to 0)
      ctx.fillStyle = labelColor;
      ctx.font = '500 11px Outfit';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((10 - i * 2).toString(), paddingLeft - 8, y);
    }

    // X Axis positioning
    const pointsCount = pSessions.length;
    const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

    // Pain Data coordinates
    const painPoints = pSessions.map((s, index) => {
      const x = paddingLeft + index * xStep;
      // Pain is 0-10 scale
      const y = paddingTop + chartHeight - (s.pain / 10) * chartHeight;
      return { x, y };
    });

    // Mobility Data coordinates
    const mobilityPoints = pSessions.map((s, index) => {
      const x = paddingLeft + index * xStep;
      // Mobility is 0-100 scale
      const y = paddingTop + chartHeight - (s.mobility / 100) * chartHeight;
      return { x, y };
    });

    // Create Gradients
    const mobilityGrad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
    mobilityGrad.addColorStop(0, 'rgba(20, 184, 166, 0.22)');
    mobilityGrad.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

    const painGrad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
    painGrad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
    painGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    // Draw Mobility Line (Teal/Green)
    drawTrendLine(ctx, mobilityPoints, '#14b8a6', '#2dd4bf', 3, mobilityGrad, chartHeight, paddingTop);

    // Draw Pain Line (Red/Coral)
    drawTrendLine(ctx, painPoints, '#ef4444', '#f87171', 3, painGrad, chartHeight, paddingTop);

    // Draw X labels (Sessions)
    pSessions.forEach((s, index) => {
      const x = paddingLeft + index * xStep;
      ctx.fillStyle = labelColor;
      ctx.font = '600 10px Outfit';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`S${index + 1}`, x, height - paddingBottom + 8);
    });

    // Draw Legend
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px Outfit';
    
    // Pain Indicator dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(width - 150, 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText('Dolor (0-10)', width - 140, 10);

    // Mobility Indicator dot
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath(); ctx.arc(width - 70, 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText('Movilidad %', width - 60, 10);
}

function drawTrendLine(ctx, points, color, glowColor, lineWidth, fillGradient = null, chartHeight = 0, paddingTop = 0) {
    if (points.length === 0) return;

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = fillGradient ? 0 : 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.lineTo(points[0].x, points[0].y);
    } else if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    if (fillGradient && chartHeight > 0) {
      const fillPath = new Path2D();
      fillPath.moveTo(points[0].x, points[0].y);
      if (points.length === 1) {
        fillPath.lineTo(points[0].x, points[0].y);
      } else if (points.length === 2) {
        fillPath.lineTo(points[1].x, points[1].y);
      } else {
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          fillPath.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        fillPath.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
      fillPath.lineTo(points[points.length - 1].x, paddingTop + chartHeight);
      fillPath.lineTo(points[0].x, paddingTop + chartHeight);
      fillPath.closePath();
      ctx.fillStyle = fillGradient;
      ctx.shadowBlur = 0;
      ctx.fill(fillPath);
    }

    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw dots
    points.forEach((pt) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
}

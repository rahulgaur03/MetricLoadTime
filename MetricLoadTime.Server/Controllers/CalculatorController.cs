using Microsoft.AspNetCore.Mvc;

namespace MetricLoadTime.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CalculatorController : ControllerBase
    {
        // GET api/calculator/add
        [HttpGet("add")]
        public IActionResult Add(int number1, int number2)
        {
            int result = number1 + number2;
            return Ok(result);
        }

        // [HttpGet("sub")]
        // public IActionResult Sub(int number1, int number2)
        // {
        //     int result = number1 - number2;
        //     return Ok(result);
        // }

        // Add more methods for other operations like subtraction, multiplication, division, etc.
    }

public class CalculationRequest
{
    public int Number1 { get; set; }
    public int Number2 { get; set; }
}
}
